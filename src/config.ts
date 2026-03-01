export const PORT = Number(process.env.PORT || 8000);
export const HEALTH_CHECK_URL = process.env.HEALTH_CHECK_URL || `http://localhost:${PORT}`;
