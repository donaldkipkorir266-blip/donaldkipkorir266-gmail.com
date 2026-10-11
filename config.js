// NyumbaFlow connection settings.
// These two values are PUBLIC by design. They only say where your database is.
// The database's own rules decide who can read or change anything.
//
// NEVER put a "secret" key, "service_role" key or any password in this file.
// This file is public on the internet as soon as the site is live.
window.NF_CONFIG = {
  // Supabase > Project Settings > API: "Project URL", for example https://abcdwxyz.supabase.co
  SUPABASE_URL: 'PASTE_YOUR_PROJECT_URL_HERE',

  // Supabase > Project Settings > API Keys: the "publishable" key (starts with sb_publishable_).
  // If your project only has the older keys, use the "anon" key. Never the secret or service_role key.
  SUPABASE_KEY: 'PASTE_YOUR_PUBLISHABLE_KEY_HERE',

  // Must match the LOGIN_EMAIL_DOMAIN secret of the Edge Function (default example.com).
  LOGIN_EMAIL_DOMAIN: 'example.com',

  // Name of the Edge Function you deployed.
  FUNCTION_NAME: 'admin-users'
};
