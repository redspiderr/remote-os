import { notFound } from "next/navigation";
import { getPostBySlug, getAllPosts, getRelatedPosts } from "@/lib/blog";
import ReadingProgress from "@/components/ReadingProgress";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import BlogCard from "@/components/BlogCard";

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} — REMOTE OS Journal`,
    description: post.excerpt,
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const related = getRelatedPosts(slug, post.tags, 2);

  return (
    <div className="min-h-full flex flex-col">
      <ReadingProgress />

      {/* Header / Breadcrumb */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4 w-full">
        <a
          href="/blog"
          className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#2A6FBB] transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Journal
        </a>
      </div>

      {/* Article */}
      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 w-full">
        {/* Title */}
        <header className="mb-10">
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase border bg-[#2A6FBB]/10 text-[#2A6FBB] border-[#2A6FBB]/20"
              >
                {tag.replace("-", " ")}
              </span>
            ))}
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#F9F7F2] leading-tight mb-4">
            {post.title}
          </h1>
          <p className="text-base text-[#6B7280] leading-relaxed">{post.excerpt}</p>
        </header>

        {/* Author bar */}
        <div className="flex items-center gap-4 py-6 border-y border-[#2A6FBB]/10 mb-10">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#2A6FBB] to-[#5A7D3F] flex items-center justify-center text-white text-sm font-bold shrink-0">
            {post.author
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#F9F7F2]">{post.author}</p>
            <p className="text-xs text-[#6B7280] truncate">{post.authorBio}</p>
          </div>
          <div className="ml-auto flex items-center gap-3 text-xs text-[#6B7280] shrink-0">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {post.readTime}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 005.25 9h13.5A2.25 2.25 0 0021 11.25v7.5" />
              </svg>
              {new Date(post.date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="font-serif">
          <MarkdownRenderer content={post.content} />
        </div>
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section className="border-t border-[#2A6FBB]/10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
            <h2 className="text-sm font-semibold text-[#6B7280] uppercase tracking-widest mb-6">
              Related Articles
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <BlogCard
                  key={r.slug}
                  slug={r.slug}
                  title={r.title}
                  excerpt={r.excerpt}
                  readTime={r.readTime}
                  date={r.date}
                  tags={r.tags}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer CTA */}
      <section className="border-t border-[#2A6FBB]/10 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
          <p className="text-sm text-[#6B7280] mb-4">
            Ready to work on your own schedule?
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2A6FBB] text-white text-sm font-semibold hover:bg-[#2A6FBB]/90 transition-colors"
          >
            Start Recording Standups
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </div>
      </section>
    </div>
  );
}
