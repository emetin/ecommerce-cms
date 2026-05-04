export type CareerRegion = "usa" | "turkiye";

export type CareerPosition = {
  slug: string;
  title: string;
  department: string;
  category: string;
  region: CareerRegion;
  location: string;
  type: string;
  summary: string;
  intro: string;
  image: string;
  legacyUrl?: string;
  responsibilities: string[];
  requirements: string[];
  preferred: string[];
};

const usaImage =
  "https://cdn.shopify.com/s/files/1/0765/3320/3253/files/Warehouse_Pictures9_1_1_1.jpg?v=1696929444";

const houstonImage =
  "https://cdn.shopify.com/s/files/1/0765/3320/3253/files/teksas_1600_962.jpg?v=1744703712";

const turkiyeImage =
  "http://www.globaltexusa.com/slider%20works%20-14-%20kopya.jpg";

function createPosition(input: {
  slug: string;
  title: string;
  department: string;
  category: string;
  region: CareerRegion;
  location: string;
  type?: string;
  image?: string;
  legacyUrl?: string;
  summary?: string;
}): CareerPosition {
  return {
    slug: input.slug,
    title: input.title,
    department: input.department,
    category: input.category,
    region: input.region,
    location: input.location,
    type: input.type || "Full-time",
    image: input.image || (input.region === "usa" ? usaImage : turkiyeImage),
    legacyUrl: input.legacyUrl,
    summary:
      input.summary ||
      `Join Globaltex Fine Linens as ${input.title} and contribute to a growing hospitality textile brand.`,
    intro:
      `We are looking for a ${input.title} who can support Globaltex Fine Linens with professionalism, attention to detail, and a long-term growth mindset. This role contributes to our operational strength, customer experience, and brand development.`,
    responsibilities: [
      "Support daily role-specific operations with a structured and professional approach.",
      "Coordinate with internal teams to ensure clear communication and timely follow-up.",
      "Maintain accurate records, updates, and documentation related to the role.",
      "Contribute to service quality, operational efficiency, and customer satisfaction.",
      "Represent Globaltex Fine Linens with a professional and solution-oriented mindset.",
    ],
    requirements: [
      "Relevant experience or strong interest in the related department.",
      "Clear communication and strong follow-up skills.",
      "Ability to work with deadlines, priorities, and changing business needs.",
      "Attention to detail and a responsible working style.",
      "Comfortable using digital tools, email, spreadsheets, or role-specific systems.",
    ],
    preferred: [
      "Experience in hospitality, textile, distribution, B2B sales, or operations.",
      "English communication skills depending on the role.",
      "Experience working with international teams or customer-focused environments.",
    ],
  };
}

export const careerPositions: CareerPosition[] = [
  createPosition({
    slug: "director-of-sales",
    title: "Director of Sales",
    department: "Sales",
    category: "Sales & Business Development",
    region: "usa",
    location: "Globaltex Fine Linens - Miami, FL",
    legacyUrl: "https://www.globaltexusa.com/pages/director-of-sales",
    summary:
      "Lead sales growth, key accounts, and hospitality business development for Globaltex Fine Linens.",
  }),
  createPosition({
    slug: "human-resources-administrative-assistant",
    title: "Human Resources Administrative Assistant",
    department: "Human Resources",
    category: "Sales & Business Development",
    region: "usa",
    location: "Globaltex Fine Linens - Miami, FL",
    legacyUrl:
      "https://www.globaltexusa.com/pages/human-resources-administrative-assistant",
  }),
  createPosition({
    slug: "international-franchise-sales-manager",
    title: "International Franchise Sales Manager",
    department: "Sales",
    category: "Sales & Business Development",
    region: "usa",
    location: "Globaltex Fine Linens",
    legacyUrl:
      "https://www.globaltexusa.com/pages/international-franchise-sales-manager",
  }),
  createPosition({
    slug: "sales-manager",
    title: "Sales Manager",
    department: "Sales",
    category: "Sales & Business Development",
    region: "usa",
    location: "Globaltex Fine Linens - Orlando / Tampa, FL",
    legacyUrl: "https://www.globaltexusa.com/pages/sales-manager",
  }),
  createPosition({
    slug: "sales-manager-houston-tx",
    title: "Sales Manager",
    department: "Sales",
    category: "Sales & Business Development",
    region: "usa",
    location: "Globaltex Fine Linens - Houston, TX",
    image: houstonImage,
    legacyUrl: "https://www.globaltexusa.com/pages/sales-manager-houston-tx",
  }),
  createPosition({
    slug: "sales-manager-south-florida",
    title: "Sales Manager",
    department: "Sales",
    category: "Sales & Business Development",
    region: "usa",
    location: "Globaltex Fine Linens - South Florida",
    legacyUrl:
      "https://www.globaltexusa.com/pages/sales-manager-south-florida",
  }),
  createPosition({
    slug: "in-house-sales-manager",
    title: "In-House Sales Manager",
    department: "Sales",
    category: "Sales & Business Development",
    region: "usa",
    location: "Globaltex Fine Linens - South Florida",
    legacyUrl: "https://www.globaltexusa.com/pages/in-house-sales-manager",
  }),
  createPosition({
    slug: "national-account-manager",
    title: "National Account Manager",
    department: "Sales",
    category: "Sales & Business Development",
    region: "usa",
    location: "Globaltex Fine Linens",
    legacyUrl: "https://www.globaltexusa.com/pages/national-account-manager",
  }),
  createPosition({
    slug: "warehouse-associate-miami-fl",
    title: "Warehouse Associate",
    department: "Operations",
    category: "Operations & Logistics",
    region: "usa",
    location: "Globaltex Fine Linens - Miami, FL",
    legacyUrl:
      "https://www.globaltexusa.com/pages/warehouse-associate-miami-fl",
  }),
  createPosition({
    slug: "driver",
    title: "Driver",
    department: "Operations",
    category: "Operations & Logistics",
    region: "usa",
    location: "Globaltex Fine Linens - Miami, FL",
    legacyUrl: "https://www.globaltexusa.com/pages/driver",
  }),
  createPosition({
    slug: "embroidery-machine-operator",
    title: "Embroidery Machine Operator",
    department: "Production",
    category: "Production & Technical",
    region: "usa",
    location: "Globaltex Fine Linens - Miami, FL",
    legacyUrl:
      "https://www.globaltexusa.com/pages/embroidery-machine-operator",
  }),
  createPosition({
    slug: "industrial-seamstress-seamster",
    title: "Industrial Seamstress / Seamster",
    department: "Production",
    category: "Production & Technical",
    region: "usa",
    location: "Globaltex Fine Linens - Miami, FL",
    legacyUrl:
      "https://www.globaltexusa.com/pages/industrial-seamstress-seamster",
  }),
  createPosition({
    slug: "front-desk-representative",
    title: "Front Desk / Receptionist / Administrative Assistant",
    department: "Customer Support & Admin",
    category: "Customer Support & Admin",
    region: "usa",
    location: "Globaltex Fine Linens - Miami, FL",
    legacyUrl: "https://www.globaltexusa.com/pages/front-desk-representative",
  }),
  createPosition({
    slug: "customer-support-specialist",
    title: "Customer Support Specialist",
    department: "Customer Support",
    category: "Customer Support & Admin",
    region: "usa",
    location: "Globaltex Fine Linens - Miami, FL",
    legacyUrl: "https://www.globaltexusa.com/pages/customer-support-specialist",
  }),
  createPosition({
    slug: "account-receivable",
    title: "Account Receivable",
    department: "Accounting",
    category: "Customer Support & Admin",
    region: "usa",
    location: "Globaltex Fine Linens - Miami, FL",
    legacyUrl: "https://www.globaltexusa.com/pages/account-receivable",
  }),
  createPosition({
    slug: "intern-miami-fl",
    title: "Intern",
    department: "Start Your Journey",
    category: "Start Your Journey",
    region: "usa",
    location: "Globaltex Fine Linens - Miami, FL",
    legacyUrl: "https://www.globaltexusa.com/pages/intern-miami-fl",
  }),

  createPosition({
    slug: "accounting-assistant",
    title: "Accounting Assistant",
    department: "Accounting",
    category: "Open Positions in Türkiye",
    region: "turkiye",
    location: "Patak Textile - Denizli, TR",
    legacyUrl: "https://www.globaltexusa.com/pages/accounting-assistant",
  }),
  createPosition({
    slug: "digital-marketing-specialist",
    title: "Digital Marketing Specialist",
    department: "Marketing",
    category: "Open Positions in Türkiye",
    region: "turkiye",
    location: "Patak Textile - Denizli, TR",
    legacyUrl: "https://www.globaltexusa.com/pages/digital-marketing-specialist",
  }),
  createPosition({
    slug: "web-master-web-developer",
    title: "Web Master / Web Developer",
    department: "Technology",
    category: "Open Positions in Türkiye",
    region: "turkiye",
    location: "Patak Textile - Denizli, TR",
    legacyUrl: "https://www.globaltexusa.com/pages/web-master-web-developer",
  }),
  createPosition({
    slug: "human-resources-specialist",
    title: "Human Resources Specialist",
    department: "Human Resources",
    category: "Open Positions in Türkiye",
    region: "turkiye",
    location: "Patak Textile - Denizli, TR",
    legacyUrl: "https://www.globaltexusa.com/pages/human-resources-specialist",
  }),
  createPosition({
    slug: "logistics-specialist",
    title: "Logistics Specialist",
    department: "Operations",
    category: "Open Positions in Türkiye",
    region: "turkiye",
    location: "Patak Textile - Denizli, TR",
    legacyUrl: "https://www.globaltexusa.com/pages/logistics-specialist",
  }),
  createPosition({
    slug: "customer-support-specialist-remote",
    title: "Customer Support Specialist",
    department: "Customer Support",
    category: "Open Positions in Türkiye",
    region: "turkiye",
    location: "Patak Textile - Denizli, TR / Remote",
    type: "Remote",
    legacyUrl:
      "https://www.globaltexusa.com/pages/customer-support-specialist-remote",
  }),
];

export function getCareerPosition(slug: string) {
  return careerPositions.find((position) => position.slug === slug);
}

export function getCareerCategories(region: CareerRegion) {
  const positions = careerPositions.filter((item) => item.region === region);

  return Array.from(new Set(positions.map((item) => item.category))).map(
    (category) => ({
      category,
      positions: positions.filter((item) => item.category === category),
    })
  );
}