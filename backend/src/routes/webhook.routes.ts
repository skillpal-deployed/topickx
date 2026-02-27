import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import express from 'express';
import prisma from '../utils/prisma';
import { distributeLead } from '../services/leadDistribution.service';
import axios from 'axios';

const router = Router();

// Facebook sends a SHA256 HMAC signature in the X-Hub-Signature-256 header.
// We MUST verify it before processing any lead data to prevent forgery.
// This requires the raw (unparsed) request body, so we capture it here
// before Express's JSON parser runs on this sub-router.
router.use(express.raw({ type: 'application/json' }));

const verifyFacebookWebhook = (req: Request, res: Response, next: NextFunction): void => {
    // Only verify POST requests (GET is only the challenge handshake)
    if (req.method !== 'POST') {
        return next();
    }

    const appSecret = process.env.FB_APP_SECRET;
    if (!appSecret) {
        console.error('[Webhook] FB_APP_SECRET not configured — rejecting all POST webhook events');
        res.sendStatus(500);
        return;
    }

    const signature = req.headers['x-hub-signature-256'] as string;
    if (!signature) {
        console.warn('[Webhook] Missing X-Hub-Signature-256 header — rejected');
        res.sendStatus(403);
        return;
    }

    // Compute expected signature from raw body
    const rawBody = req.body as Buffer;
    const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        console.warn('[Webhook] Invalid X-Hub-Signature-256 — payload rejected');
        res.sendStatus(403);
        return;
    }

    // Parse body as JSON for downstream handlers
    try {
        req.body = JSON.parse(rawBody.toString());
    } catch {
        console.error('[Webhook] Body is not valid JSON');
        res.sendStatus(400);
        return;
    }

    next();
};

router.use(verifyFacebookWebhook);

// FACEBOOK WEBHOOK VERIFICATION (GET)
router.get('/facebook', (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === process.env.FB_VERIFY_TOKEN) {
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// FACEBOOK LEAD CAPTURE (POST)
router.post('/facebook', async (req: Request, res: Response) => {
    const body = req.body;

    if (body.object === 'page') {
        for (const entry of body.entry) {
            for (const change of entry.changes) {
                if (change.field === 'leadgen') {
                    const leadgen = change.value;
                    const leadId = leadgen.leadgen_id;
                    const pageId = leadgen.page_id;
                    const formId = leadgen.form_id;

                    try {
                        // 1. Find Landing Page associated with this Form
                        const fbForm = await prisma.facebookLeadForm.findUnique({
                            where: { id: formId },
                            include: {
                                landingPage: {
                                    select: {
                                        id: true,
                                        name: true,
                                        city: true,
                                        fbAccessToken: true,
                                    }
                                }
                            }
                        });

                        if (!fbForm) {
                            console.warn(`Received lead for unknown form: ${formId}`);
                            continue;
                        }

                        // 2. Fetch Lead Details from Meta API
                        // Requires permanent page access token stored in LandingPage
                        const accessToken = fbForm.landingPage.fbAccessToken;
                        if (!accessToken) {
                            console.warn(`No access token for LP: ${fbForm.landingPage.name}`);
                            continue;
                        }

                        const fbLeadUrl = `https://graph.facebook.com/v19.0/${leadId}?access_token=${accessToken}`;
                        const fbResponse = await axios.get(fbLeadUrl);
                        const fbData = fbResponse.data;

                        // Map FB fields to our schema
                        // This mapping depends on the form field names set in FB
                        const fieldData: any = {};
                        fbData.field_data.forEach((field: any) => {
                            fieldData[field.name] = field.values[0];
                        });

                        const landingPage = fbForm.landingPage as any;

                        // 3. Save Lead to Common Leads (no projectId — FB/LP leads are not tied to a specific project)
                        const newLead = await prisma.lead.create({
                            data: {
                                name: fieldData.full_name || fieldData.name || 'Unknown',
                                email: fieldData.email || '',
                                phone: fieldData.phone_number || fieldData.phone || '',
                                location: fieldData.location || '',
                                city: fieldData.city || landingPage.city || '', // LP city as fallback
                                budget: fieldData.budget || '',
                                projectType: fieldData.project_type || '',
                                unitType: fieldData.unit_type || '',
                                propertyType: fieldData.property_type || '',
                                fbLeadId: leadId,
                                source: 'facebook',
                                landingPageId: fbForm.landingPageId,
                                projectId: null, // LP-sourced — distributed by distributeLead
                                status: 'unassigned'
                            }
                        });

                        // 4. Trigger Distribution
                        await distributeLead(newLead.id);

                    } catch (error) {
                        console.error('Error processing FB lead:', error);
                    }
                }
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

export default router;
