"use client";

interface BlogCardProps {
  slug: string;
  title: string;
  excerpt: string;
  readTime: string;
  date: string;
  tags: string[];
  gradient?: string;
}

const tagColors: Record<string, string> = {
  async: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  standups: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  productivity: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "remote-work": "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  video: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  culture: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  health: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  inclusivity: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
};

const gradients = [
  "from-indigo-500/20 via-purple-500/20 to-rose-500/20",
  "from-emerald-500/20 via-teal-500/20 to-cyan-500/20",
  "from-amber-500/20 via-orange-500/20 to-rose-500/20",
  "from-sky-500/20 via-blue-500/20 to-indigo-500/20",
  "from-fuchsia-500/20 via-purple-500/20 to-pink-500/20",
];

export default function BlogCard({
  slug,
  title,
  excerpt,
  readTime,
  date,
  tags,
  gradient,
}: BlogCardProps) {
  const grad = gradient || gradients[slug.length % gradients.length];

  return (
    <a
      href={`/blog/${slug}`}
      className="group block rounded-2xl border border-[#2A6FBB]/10 bg-[#111320] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#2A6FBB]/10 hover:border-[#2A6FBB]/30"
    >
      {/* Image placeholder / gradient */}
      <div
        className={`h-40 w-full bg-gradient-to-br ${grad} flex items-center justify-center`}
      >
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#0B0D17]/60 border border-white/10 backdrop-blur-sm">
          <svg
            className="w-5 h-5 text-white/70"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
            />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 sm:p-6">
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map((tag) => (
            <span
              key={tag}
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase border ${
                tagColors[tag] || "bg-[#2A6FBB]/10 text-[#2A6FBB] border-[#2A6FBB]/20"
              }`}
            >
              {tag.replace("-", " ")}
            </span>
          ))}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-[#F9F7F2] leading-snug mb-2 group-hover:text-[#2A6FBB] transition-colors">
          {title}
        </h3>

        {/* Excerpt */}
        <p className="text-sm text-[#6B7280] leading-relaxed line-clamp-3 mb-4">
          {excerpt}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-[#6B7280]">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {readTime}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 005.25 9h13.5A2.25 2.25 0 0021 11.25v7.5" />
            </svg>
            {new Date(date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </a>
  );
}
