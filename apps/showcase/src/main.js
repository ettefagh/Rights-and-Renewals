/**
 * main.js
 * Application Bootstrap & Event Bus for CM-LAB Showcase Webpage
 * Milestone M2 (Features 4, 5, 6, 7, 8, 9, 10, 19)
 */

import { PlaygroundController } from './components/playground.js';
import { SimulatorController } from './components/simulator.js';
import { CalendarSuiteController } from './components/calendars.js';
import { OmnibarDemoController } from './components/omnibar.js';
import { ModularWidgetsController } from './components/widgets.js';
import { QuickConnectDrawerController } from './components/drawer.js';
import { SAMPLE_SHOWCASE_ITEMS } from './data/showcaseSampleData.js';

// Pre-seeded 20 canonical brands fallback array
const EMBEDDED_SEED_BRANDS = [
  { service_slug: "spotify", brand_name: "Spotify", category: "subscription", statutory_basis: ["BGB § 309 Nr. 9", "BGB § 312k"], cancellation_button_compliant: true, cancellation_button_url: "https://www.spotify.com/account/subscription/cancel/", search_aliases: ["spotify", "music", "streaming"] },
  { service_slug: "netflix", brand_name: "Netflix", category: "subscription", statutory_basis: ["BGB § 309 Nr. 9", "BGB § 312k"], cancellation_button_compliant: true, cancellation_button_url: "https://www.netflix.com/youraccount", search_aliases: ["netflix", "movies", "streaming"] },
  { service_slug: "amazon-prime", brand_name: "Amazon Prime Student", category: "subscription", statutory_basis: ["BGB § 309 Nr. 9", "BGB § 312k"], cancellation_button_compliant: true, cancellation_button_url: "https://www.amazon.de/mc/manage/membership", search_aliases: ["amazon", "prime"] },
  { service_slug: "adobe", brand_name: "Adobe Creative Cloud", category: "subscription", statutory_basis: ["BGB § 309 Nr. 9", "BGB § 312k"], cancellation_button_compliant: true, cancellation_button_url: "https://account.adobe.com/plans", search_aliases: ["adobe", "photoshop"] },
  { service_slug: "fitx", brand_name: "FitX Fitness", category: "subscription", statutory_basis: ["BGB § 309 Nr. 9", "BGB § 312k"], cancellation_button_compliant: true, cancellation_button_url: "https://selfservice.fitx.de/kuendigung", search_aliases: ["fitx", "gym"] },
  { service_slug: "mcfit", brand_name: "McFIT (RSG Group)", category: "subscription", statutory_basis: ["BGB § 309 Nr. 9", "BGB § 312k"], cancellation_button_compliant: true, cancellation_button_url: "https://mein.mcfit.com/contract", search_aliases: ["mcfit", "rsg"] },
  { service_slug: "jetbrains", brand_name: "JetBrains", category: "subscription", statutory_basis: ["BGB § 309 Nr. 9"], cancellation_button_compliant: true, cancellation_button_url: "https://account.jetbrains.com/licenses", search_aliases: ["jetbrains", "ide"] },
  { service_slug: "github-copilot", brand_name: "GitHub Copilot", category: "subscription", statutory_basis: ["BGB § 309 Nr. 9"], cancellation_button_compliant: true, cancellation_button_url: "https://github.com/settings/billing", search_aliases: ["github", "copilot"] },
  { service_slug: "chatgpt-plus", brand_name: "ChatGPT Plus (OpenAI)", category: "subscription", statutory_basis: ["BGB § 309 Nr. 9"], cancellation_button_compliant: true, cancellation_button_url: "https://chatgpt.com/#settings/subscription", search_aliases: ["chatgpt", "openai"] },
  { service_slug: "icloud", brand_name: "Apple iCloud+", category: "subscription", statutory_basis: ["BGB § 309 Nr. 9"], cancellation_button_compliant: true, cancellation_button_url: "https://support.apple.com/HT207594", search_aliases: ["icloud", "apple"] },
  { service_slug: "apple", brand_name: "Apple", category: "hardware", statutory_basis: ["BGB § 434", "BGB § 437", "BGB § 438", "BGB § 477"], statutory_warranty_months: 24, reversed_burden_months: 12, search_aliases: ["apple", "macbook", "iphone", "ipad"] },
  { service_slug: "sony", brand_name: "Sony Europe", category: "hardware", statutory_basis: ["BGB § 434", "BGB § 437", "BGB § 438", "BGB § 477"], statutory_warranty_months: 24, reversed_burden_months: 12, search_aliases: ["sony", "playstation", "headphones", "wh-1000xm5"] },
  { service_slug: "samsung", brand_name: "Samsung Electronics", category: "hardware", statutory_basis: ["BGB § 434", "BGB § 437", "BGB § 438", "BGB § 477"], statutory_warranty_months: 24, reversed_burden_months: 12, search_aliases: ["samsung", "galaxy"] },
  { service_slug: "mediamarkt", brand_name: "MediaMarkt", category: "hardware", statutory_basis: ["BGB § 434", "BGB § 437", "BGB § 438", "BGB § 477"], statutory_warranty_months: 24, reversed_burden_months: 12, search_aliases: ["mediamarkt", "saturn"] },
  { service_slug: "saturn", brand_name: "Saturn", category: "hardware", statutory_basis: ["BGB § 434", "BGB § 437", "BGB § 438", "BGB § 477"], statutory_warranty_months: 24, reversed_burden_months: 12, search_aliases: ["saturn", "mediamarkt"] },
  { service_slug: "anker", brand_name: "Anker Innovations", category: "hardware", statutory_basis: ["BGB § 434", "BGB § 437", "BGB § 438", "BGB § 477"], statutory_warranty_months: 24, reversed_burden_months: 12, search_aliases: ["anker", "powerbank"] },
  { service_slug: "lenovo", brand_name: "Lenovo Germany", category: "hardware", statutory_basis: ["BGB § 434", "BGB § 437", "BGB § 438", "BGB § 477"], statutory_warranty_months: 24, reversed_burden_months: 12, search_aliases: ["lenovo", "thinkpad"] },
  { service_slug: "dyson", brand_name: "Dyson Germany", category: "hardware", statutory_basis: ["BGB § 434", "BGB § 437", "BGB § 438", "BGB § 477"], statutory_warranty_months: 24, reversed_burden_months: 12, search_aliases: ["dyson", "vacuum"] },
  { service_slug: "bose", brand_name: "Bose Germany", category: "hardware", statutory_basis: ["BGB § 434", "BGB § 437", "BGB § 438", "BGB § 477"], statutory_warranty_months: 24, reversed_burden_months: 12, search_aliases: ["bose", "qc45"] },
  { service_slug: "nintendo", brand_name: "Nintendo of Europe", category: "hardware", statutory_basis: ["BGB § 434", "BGB § 437", "BGB § 438", "BGB § 477"], statutory_warranty_months: 24, reversed_burden_months: 12, search_aliases: ["nintendo", "switch"] }
];

async function loadBrandsData() {
  try {
    const response = await fetch('./public/data/policy_wiki_seed_v1.json');
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (e) {
    // Fall back to embedded brands
  }
  return EMBEDDED_SEED_BRANDS;
}

document.addEventListener('DOMContentLoaded', async () => {
  const seedBrands = await loadBrandsData();

  // 1. Initialize MCP Playground
  const playground = new PlaygroundController({ seedBrands });

  // 2. Initialize App Simulator
  const simulator = new SimulatorController();

  // 3. Initialize Calendar Suite
  const calendars = new CalendarSuiteController({ items: SAMPLE_SHOWCASE_ITEMS });

  // 4. Initialize Unified Omnibar Demo
  const omnibar = new OmnibarDemoController({ seedBrands, sampleItems: SAMPLE_SHOWCASE_ITEMS });

  // 5. Initialize Modular Dashboard Widgets
  const widgets = new ModularWidgetsController();

  // 6. Initialize AI Agent Quick-Connect Drawer
  const drawer = new QuickConnectDrawerController();

  // Attach to window for evaluation inspection
  window.cmlabShowcase = {
    seedBrands,
    playground,
    simulator,
    calendars,
    omnibar,
    widgets,
    drawer
  };

  console.log('CM-LAB Showcase Webpage Initialized (M2 Production Ready).');
});
