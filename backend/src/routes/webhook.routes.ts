import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { distributeLead } from '../services/leadDistribution.service';
import axios from 'axios';

const router = Router();

// FACEBOOK WEBHOOK VERIFICATION (GET)
router.get('/facebook', (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === process.env.FB_VERIFY_TOKEN) {
            console.log('FB WEBHOOK_VERIFIED');
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
