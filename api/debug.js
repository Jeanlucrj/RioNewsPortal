export default function handler(req, res) {
    res.status(200).json({
        status: "ok",
        message: "Vercel JS API is working!",
        timestamp: new Date().toISOString()
    });
}
