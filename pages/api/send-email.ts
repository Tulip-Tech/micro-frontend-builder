// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import NextCors from 'nextjs-cors';
import { getLicenseInfo } from './get-license-info';
import MongoConnect from '@library/server/mongo';
import EmailTransporter from '@library/server/email-transporter';
import type { Attachment } from 'nodemailer/lib/mailer';

type Data = {
    message: string;
    status: number;
};

export const sendEmailHelper = async (key: string, to: string, subject: string, text: string, attachments: Array<Attachment> = []) => {
    await MongoConnect();
    const licenseInfo = await getLicenseInfo(key);
    if (!licenseInfo) return { status: 400, message: 'Wrong project configuration' };
    if (licenseInfo.type === 'microsoft' && (!licenseInfo.user || !licenseInfo.pass || !licenseInfo.from || !licenseInfo.sender)) {
        return { status: 400, message: 'Wrong project configuration' };
    }
    if (
        licenseInfo.type === 'gmail' &&
        (!licenseInfo.oAuth2EmailId ||
            !licenseInfo.oAuth2ClientId ||
            !licenseInfo.oAuth2ClientSecret ||
            !licenseInfo.oAuth2RefreshToken ||
            !licenseInfo.from ||
            !licenseInfo.sender)
    ) {
        return { status: 400, message: 'Wrong project configuration' };
    }
    const transporter = await EmailTransporter(licenseInfo);
    return transporter
        .sendMail({
            from: `${licenseInfo.sender} <${licenseInfo.from}>`,
            sender: licenseInfo.sender,
            to,
            subject,
            text,
            html: text,
            attachments: (attachments?.length ? attachments : [])?.map(a => ({
                ...a,
                content: typeof a.content === 'string' ? Buffer.from(a?.content?.split('base64,')[1], 'base64') : a.content,
            })),
        })
        .then(() => {
            return { status: 200, message: 'Thank you for contacting us!' };
        })
        .catch((e: any) => {
            console.log(new Date().toISOString(), 'emailer failure reason', e);
            return { status: 400, message: 'Something went wrong! Please contact admin.' };
        });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
    await NextCors(req, res, {
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
        origin: '*',
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });
    if (req.method !== 'POST') {
        res.status(400).json({ status: 400, message: 'Wrong request method' });
    }
    const { key, to, subject, text, attachments } = req.body;
    if (!key || !to || !subject || !text || (!!attachments && !Array.isArray(attachments))) {
        res.status(400).json({ status: 400, message: 'Wrong project configuration' });
        return;
    }
    const { status, message } = await sendEmailHelper(key, to, subject, text, attachments);
    res.status(status).json({ status, message });
}

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};
