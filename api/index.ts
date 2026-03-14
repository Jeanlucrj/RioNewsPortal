export default function handler(req: any, res: any) {
    res.status(200).json({
        status: "ok",
        message: "Vercel API is working!",
        timestamp: new Date().toISOString()
    });
}
