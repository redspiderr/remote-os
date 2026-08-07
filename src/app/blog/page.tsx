import { getAllPosts } from "@/lib/blog";
import BlogCard from "@/components/BlogCard";

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-full flex flex-col">
      {/* Reading progress bar placeholder — injected via client component on article pages */}

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#2A6FBB]/10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2A6FBB]/5 via-transparent to-[#5A7D3F]/5 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2A6FBB]/10 border border-[#2A6FBB]/20 text-[#2A6FBB] text-xs font-semibold mb-6">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
            </svg>
            MEDINA OS Journal
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#F9F7F2] mb-5 max-w-3xl mx-auto leading-tight">
            Async Remote Work
            <br />
            <span className="text-[#2A6FBB]">Built for Humans</span>
          </h1>
          <p className="text-[#6B7280] text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Real stories, hard data, and practical guides for distributed teams who believe presence is overrated and output is everything.
          </p>
        </div>
      </section>

      {/* Post Grid */}
      <section className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-sm font-semibold text-[#6B7280] uppercase tracking-widest">Latest Articles</h2>
          <span className="text-xs text-[#6B7280]">{posts.length} post{posts.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <BlogCard
              key={post.slug}
              slug={post.slug}
              title={post.title}
              excerpt={post.excerpt}
              readTime={post.readTime}
              date={post.date}
              tags={post.tags}
            />
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="border-t border-[#2A6FBB]/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <p className="text-sm text-[#6B7280] mb-4">
            Want to ship faster with async standups?
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2A6FBB] text-white text-sm font-semibold hover:bg-[#2A6FBB]/90 transition-colors"
          >
            Try REMOTE OS
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </div>
      </section>
    </div>
  );
}
