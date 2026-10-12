const requiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name}. Set it in .env (see .env.example).`);
    process.exit(1);
  }
  return value;
};

export const loadConfig = () => ({
  baseURL: requiredEnv("MIMOE_BASE_URL"),
  apiKey: requiredEnv("MIMOE_API_KEY"),
  model: requiredEnv("MIMOE_MODEL"),
});
