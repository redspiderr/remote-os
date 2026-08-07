import fs from "fs";
import path from "path";

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  author: string;
  authorBio: string;
  excerpt: string;
  tags: string[];
  readTime: string;
  content: string;
}

const postsDirectory = path.join(process.cwd(), "src", "content", "blog");

function parseFrontmatter(fileContent: string) {
  const match = fileContent.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) {
    return { data: {}, content: fileContent };
  }
  const frontmatter = match[1];
  const content = match[2];
  const data: Record<string, string | string[]> = {};
  for (const line of frontmatter.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      data[key] = value
        .slice(1, -1)
        .split(",")
        .map((v) => v.trim().replace(/^["']|["']$/g, ""));
    } else {
      data[key] = value.replace(/^["']|["']$/g, "");
    }
  }
  return { data, content };
}

function estimateReadTime(text: string): string {
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(postsDirectory)) return [];
  const filenames = fs.readdirSync(postsDirectory);
  const posts = filenames
    .filter((f) => f.endsWith(".md"))
    .map((filename) => {
      const slug = filename.replace(/\.md$/, "");
      const filePath = path.join(postsDirectory, filename);
      const fileContent = fs.readFileSync(filePath, "utf8");
      const { data, content } = parseFrontmatter(fileContent);
      return {
        slug,
        title: (data.title as string) || slug,
        date: (data.date as string) || "",
        author: (data.author as string) || "REMOTE OS Team",
        authorBio: (data.authorBio as string) || "Building tools for distributed teams.",
        excerpt: (data.excerpt as string) || "",
        tags: Array.isArray(data.tags) ? data.tags : [],
        readTime: estimateReadTime(content),
        content,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return posts;
}

export function getPostBySlug(slug: string): BlogPost | null {
  const filePath = path.join(postsDirectory, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const fileContent = fs.readFileSync(filePath, "utf8");
  const { data, content } = parseFrontmatter(fileContent);
  return {
    slug,
    title: (data.title as string) || slug,
    date: (data.date as string) || "",
    author: (data.author as string) || "REMOTE OS Team",
    authorBio: (data.authorBio as string) || "Building tools for distributed teams.",
    excerpt: (data.excerpt as string) || "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    readTime: estimateReadTime(content),
    content,
  };
}

export function getRelatedPosts(currentSlug: string, tags: string[], limit = 2): BlogPost[] {
  const all = getAllPosts().filter((p) => p.slug !== currentSlug);
  const scored = all.map((p) => {
    const common = p.tags.filter((t) => tags.includes(t)).length;
    return { post: p, score: common };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.post);
}
