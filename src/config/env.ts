import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Copy .env.example to .env and fill in your values.`,
    );
  }

  return value;
}

export const env = {
  discordToken: requireEnv('DISCORD_TOKEN'),
  discordClientId: requireEnv('DISCORD_CLIENT_ID'),
};

export function requireSupabaseEnv(): { supabaseUrl: string; supabaseKey: string } {
  return {
    supabaseUrl: requireEnv('SUPABASE_URL'),
    supabaseKey: requireEnv('SUPABASE_KEY'),
  };
}
