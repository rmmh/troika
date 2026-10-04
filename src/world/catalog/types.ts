export interface WebSite {
  slug: string;
  title: string;
  introduction: string;
  feature: string;
  paragraphs: string[];
}
export interface WebRing { id: string; title: string; introduction: string; sites: WebSite[]; }
export const site = (slug: string, title: string, introduction: string, feature: string, ...paragraphs: string[]): WebSite =>
  ({slug, title, introduction, feature, paragraphs});
