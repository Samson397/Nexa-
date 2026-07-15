import type { IntegrationProvider } from "@nexa/shared";
import { INTEGRATION_CATEGORIES } from "@nexa/shared";

export type IntegrationCategory = keyof typeof INTEGRATION_CATEGORIES;

export type ProviderOAuthConfig = {
  provider: IntegrationProvider;
  displayName: string;
  category: IntegrationCategory;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
  /** Some providers need extra authorize params */
  extraAuthParams?: Record<string, string>;
};

function categoryFor(provider: IntegrationProvider): IntegrationCategory {
  for (const [cat, list] of Object.entries(INTEGRATION_CATEGORIES) as Array<
    [IntegrationCategory, IntegrationProvider[]]
  >) {
    if (list.includes(provider)) return cat;
  }
  return "productivity";
}

const MICROSOFT_AUTH =
  "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const MICROSOFT_TOKEN =
  "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";

/**
 * OAuth2 endpoint + env var map for every IntegrationProvider in @nexa/shared.
 * Client IDs/secrets are NEVER hardcoded — read from env at runtime.
 */
export const PROVIDER_CONFIGS: Record<
  IntegrationProvider,
  ProviderOAuthConfig
> = {
  github: {
    provider: "github",
    displayName: "GitHub",
    category: categoryFor("github"),
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: ["read:user", "repo", "workflow"],
    clientIdEnv: "GITHUB_CLIENT_ID",
    clientSecretEnv: "GITHUB_CLIENT_SECRET",
  },
  gitlab: {
    provider: "gitlab",
    displayName: "GitLab",
    category: categoryFor("gitlab"),
    authUrl: "https://gitlab.com/oauth/authorize",
    tokenUrl: "https://gitlab.com/oauth/token",
    scopes: ["read_user", "api", "read_repository"],
    clientIdEnv: "GITLAB_CLIENT_ID",
    clientSecretEnv: "GITLAB_CLIENT_SECRET",
  },
  slack: {
    provider: "slack",
    displayName: "Slack",
    category: categoryFor("slack"),
    authUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    scopes: ["channels:read", "chat:write", "users:read"],
    clientIdEnv: "SLACK_CLIENT_ID",
    clientSecretEnv: "SLACK_CLIENT_SECRET",
  },
  discord: {
    provider: "discord",
    displayName: "Discord",
    category: categoryFor("discord"),
    authUrl: "https://discord.com/api/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    scopes: ["identify", "guilds", "bot"],
    clientIdEnv: "DISCORD_CLIENT_ID",
    clientSecretEnv: "DISCORD_CLIENT_SECRET",
  },
  notion: {
    provider: "notion",
    displayName: "Notion",
    category: categoryFor("notion"),
    authUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    scopes: [],
    clientIdEnv: "NOTION_CLIENT_ID",
    clientSecretEnv: "NOTION_CLIENT_SECRET",
    extraAuthParams: { owner: "user" },
  },
  trello: {
    provider: "trello",
    displayName: "Trello",
    category: categoryFor("trello"),
    authUrl: "https://trello.com/1/authorize",
    tokenUrl: "https://trello.com/1/OAuthGetAccessToken",
    scopes: ["read", "write"],
    clientIdEnv: "TRELLO_CLIENT_ID",
    clientSecretEnv: "TRELLO_CLIENT_SECRET",
    extraAuthParams: { expiration: "never", response_type: "token" },
  },
  clickup: {
    provider: "clickup",
    displayName: "ClickUp",
    category: categoryFor("clickup"),
    authUrl: "https://app.clickup.com/api",
    tokenUrl: "https://api.clickup.com/api/v2/oauth/token",
    scopes: [],
    clientIdEnv: "CLICKUP_CLIENT_ID",
    clientSecretEnv: "CLICKUP_CLIENT_SECRET",
  },
  stripe: {
    provider: "stripe",
    displayName: "Stripe",
    category: categoryFor("stripe"),
    authUrl: "https://connect.stripe.com/oauth/authorize",
    tokenUrl: "https://connect.stripe.com/oauth/token",
    scopes: ["read_write"],
    clientIdEnv: "STRIPE_CLIENT_ID",
    clientSecretEnv: "STRIPE_CLIENT_SECRET",
  },
  paypal: {
    provider: "paypal",
    displayName: "PayPal",
    category: categoryFor("paypal"),
    authUrl: "https://www.paypal.com/signin/authorize",
    tokenUrl: "https://api-m.paypal.com/v1/oauth2/token",
    scopes: ["openid", "profile"],
    clientIdEnv: "PAYPAL_CLIENT_ID",
    clientSecretEnv: "PAYPAL_CLIENT_SECRET",
  },
  shopify: {
    provider: "shopify",
    displayName: "Shopify",
    category: categoryFor("shopify"),
    authUrl: "https://admin.shopify.com/oauth/authorize",
    tokenUrl: "https://admin.shopify.com/admin/oauth/access_token",
    scopes: ["read_products", "read_orders", "write_products"],
    clientIdEnv: "SHOPIFY_CLIENT_ID",
    clientSecretEnv: "SHOPIFY_CLIENT_SECRET",
  },
  woocommerce: {
    provider: "woocommerce",
    displayName: "WooCommerce",
    category: categoryFor("woocommerce"),
    authUrl: "https://woocommerce.com/oauth/authorize",
    tokenUrl: "https://woocommerce.com/oauth/token",
    scopes: ["read", "write"],
    clientIdEnv: "WOOCOMMERCE_CLIENT_ID",
    clientSecretEnv: "WOOCOMMERCE_CLIENT_SECRET",
  },
  x: {
    provider: "x",
    displayName: "X",
    category: categoryFor("x"),
    authUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scopes: ["tweet.read", "users.read", "offline.access"],
    clientIdEnv: "X_CLIENT_ID",
    clientSecretEnv: "X_CLIENT_SECRET",
  },
  facebook: {
    provider: "facebook",
    displayName: "Facebook",
    category: categoryFor("facebook"),
    authUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    scopes: ["pages_show_list", "pages_read_engagement"],
    clientIdEnv: "FACEBOOK_CLIENT_ID",
    clientSecretEnv: "FACEBOOK_CLIENT_SECRET",
  },
  instagram: {
    provider: "instagram",
    displayName: "Instagram",
    category: categoryFor("instagram"),
    authUrl: "https://api.instagram.com/oauth/authorize",
    tokenUrl: "https://api.instagram.com/oauth/access_token",
    scopes: ["user_profile", "user_media"],
    clientIdEnv: "INSTAGRAM_CLIENT_ID",
    clientSecretEnv: "INSTAGRAM_CLIENT_SECRET",
  },
  tiktok: {
    provider: "tiktok",
    displayName: "TikTok",
    category: categoryFor("tiktok"),
    authUrl: "https://www.tiktok.com/v2/auth/authorize",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token",
    scopes: ["user.info.basic", "video.list"],
    clientIdEnv: "TIKTOK_CLIENT_ID",
    clientSecretEnv: "TIKTOK_CLIENT_SECRET",
  },
  linkedin: {
    provider: "linkedin",
    displayName: "LinkedIn",
    category: categoryFor("linkedin"),
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: ["openid", "profile", "w_member_social"],
    clientIdEnv: "LINKEDIN_CLIENT_ID",
    clientSecretEnv: "LINKEDIN_CLIENT_SECRET",
  },
  youtube: {
    provider: "youtube",
    displayName: "YouTube",
    category: categoryFor("youtube"),
    authUrl: GOOGLE_AUTH,
    tokenUrl: GOOGLE_TOKEN,
    scopes: [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/youtube.upload",
    ],
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    extraAuthParams: { access_type: "offline", prompt: "consent" },
  },
  google_drive: {
    provider: "google_drive",
    displayName: "Google Drive",
    category: categoryFor("google_drive"),
    authUrl: GOOGLE_AUTH,
    tokenUrl: GOOGLE_TOKEN,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    extraAuthParams: { access_type: "offline", prompt: "consent" },
  },
  dropbox: {
    provider: "dropbox",
    displayName: "Dropbox",
    category: categoryFor("dropbox"),
    authUrl: "https://www.dropbox.com/oauth2/authorize",
    tokenUrl: "https://api.dropboxapi.com/oauth2/token",
    scopes: [],
    clientIdEnv: "DROPBOX_CLIENT_ID",
    clientSecretEnv: "DROPBOX_CLIENT_SECRET",
    extraAuthParams: { token_access_type: "offline" },
  },
  onedrive: {
    provider: "onedrive",
    displayName: "OneDrive",
    category: categoryFor("onedrive"),
    authUrl: MICROSOFT_AUTH,
    tokenUrl: MICROSOFT_TOKEN,
    scopes: ["offline_access", "Files.Read", "User.Read"],
    clientIdEnv: "MICROSOFT_CLIENT_ID",
    clientSecretEnv: "MICROSOFT_CLIENT_SECRET",
  },
  gmail: {
    provider: "gmail",
    displayName: "Gmail",
    category: categoryFor("gmail"),
    authUrl: GOOGLE_AUTH,
    tokenUrl: GOOGLE_TOKEN,
    scopes: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.compose",
    ],
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    extraAuthParams: { access_type: "offline", prompt: "consent" },
  },
  outlook: {
    provider: "outlook",
    displayName: "Outlook",
    category: categoryFor("outlook"),
    authUrl: MICROSOFT_AUTH,
    tokenUrl: MICROSOFT_TOKEN,
    scopes: ["offline_access", "Mail.Read", "Mail.ReadWrite", "User.Read"],
    clientIdEnv: "MICROSOFT_CLIENT_ID",
    clientSecretEnv: "MICROSOFT_CLIENT_SECRET",
  },
  google_calendar: {
    provider: "google_calendar",
    displayName: "Google Calendar",
    category: categoryFor("google_calendar"),
    authUrl: GOOGLE_AUTH,
    tokenUrl: GOOGLE_TOKEN,
    scopes: ["https://www.googleapis.com/auth/calendar"],
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    extraAuthParams: { access_type: "offline", prompt: "consent" },
  },
  outlook_calendar: {
    provider: "outlook_calendar",
    displayName: "Outlook Calendar",
    category: categoryFor("outlook_calendar"),
    authUrl: MICROSOFT_AUTH,
    tokenUrl: MICROSOFT_TOKEN,
    scopes: ["offline_access", "Calendars.ReadWrite", "User.Read"],
    clientIdEnv: "MICROSOFT_CLIENT_ID",
    clientSecretEnv: "MICROSOFT_CLIENT_SECRET",
  },
  apple_calendar: {
    provider: "apple_calendar",
    displayName: "Apple Calendar",
    category: categoryFor("apple_calendar"),
    authUrl: "https://appleid.apple.com/auth/authorize",
    tokenUrl: "https://appleid.apple.com/auth/token",
    scopes: ["name", "email"],
    clientIdEnv: "APPLE_CLIENT_ID",
    clientSecretEnv: "APPLE_CLIENT_SECRET",
    extraAuthParams: { response_mode: "form_post" },
  },
};

export function getProviderConfig(
  provider: string,
): ProviderOAuthConfig | null {
  if (provider in PROVIDER_CONFIGS) {
    return PROVIDER_CONFIGS[provider as IntegrationProvider];
  }
  return null;
}

export function hasProviderCredentials(config: ProviderOAuthConfig): boolean {
  const id = process.env[config.clientIdEnv];
  const secret = process.env[config.clientSecretEnv];
  return Boolean(id && secret);
}

export function listProviderConfigs(): ProviderOAuthConfig[] {
  return Object.values(PROVIDER_CONFIGS);
}
