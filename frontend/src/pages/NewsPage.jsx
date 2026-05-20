import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { format, parseISO, addDays, subDays, isToday, isFuture } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  Calendar as CalendarIcon,
  Newspaper,
  Clock,
  ExternalLink,
  Languages,
} from "lucide-react";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const API = `${import.meta.env.VITE_BACKEND_URL}/api`;
const STATUS_POLL_INTERVAL_MS = 60_000;
const SKELETON_KEYS = ["sk-a", "sk-b", "sk-c", "sk-d", "sk-e", "sk-f"];

const translateText = async (text) => {
  if (!text) return "";
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ne&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Translation failed");
    const data = await response.json();
    if (data && data[0]) {
      return data[0].map(item => item[0]).join("");
    }
    return text;
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
};

const CATEGORIES = [
  "All",
  "Politics",
  "Sports",
  "Weather",
  "Crime",
  "Tourism",
  "Business",
  "Health",
  "Education",
  "General",
  "Social Media"
];

const fmtDate = (d) => format(d, "yyyy-MM-dd");

const formatPublishedAt = (publishedAt, formatStr = "d MMM · HH:mm") => {
  try {
    return format(parseISO(publishedAt), formatStr);
  } catch {
    return "";
  }
};

const NewsPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [category, setCategory] = useState("All");
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const dateStr = useMemo(() => fmtDate(selectedDate), [selectedDate]);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const params = { date: dateStr };
      if (category && category !== "All") params.category = category;
      const res = await axios.get(`${API}/news`, { params });
      setArticles(res.data || []);
    } catch (err) {
      console.error("fetchNews failed:", err);
      toast.error("Failed to load news");
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [dateStr, category]);

  // Poll status and refresh news when scrape completes
  useEffect(() => {
    let interval;
    const pollStatus = async () => {
      try {
        const res = await axios.get(`${API}/news/status`);
        const newStatus = res.data;

        // If it was running and just stopped, refresh the news
        if (status?.is_running && !newStatus.is_running) {
          fetchNews();
        }

        setStatus(newStatus);
      } catch (err) {
        console.error("Status poll failed", err);
      }
    };

    pollStatus();
    // Poll every 5s if running, otherwise every 60s
    const delay = status?.is_running ? 5000 : STATUS_POLL_INTERVAL_MS;
    interval = setInterval(pollStatus, delay);

    return () => clearInterval(interval);
  }, [status?.is_running, fetchNews]);

  // Auto-refresh news feed
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNews();
    const interval = setInterval(fetchNews, 300_000); // Auto-refresh every 5 minutes
    return () => clearInterval(interval);
  }, [fetchNews]);

  const handleRefresh = async () => {
    setRefreshing(true);
    toast.info("Fetching the latest Sikkim headlines…");
    try {
      await axios.post(`${API}/news/refresh`);
    } catch (err) {
      console.error("handleRefresh failed:", err);
      const msg = err?.response?.data?.detail || "Refresh failed";
      toast.error(msg);
    } finally {
      setRefreshing(false);
    }
  };

  const goPrev = () => setSelectedDate((d) => subDays(d, 1));
  const goNext = () => {
    const next = addDays(selectedDate, 1);
    if (isFuture(next) && !isToday(next)) return;
    setSelectedDate(next);
  };
  const nextDisabled = isToday(selectedDate);

  // All articles will render inside a single aligned grid

  return (
    <div className="min-h-screen bg-stone-50/10">
      <header className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 pt-8 pb-2" data-testid="site-header">
        {/* Classical Newspaper Masthead Structure */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-stone-800 pb-4">

          {/* Left Ear: Weather & Vol Index */}
          <div className="hidden md:block ear-text text-left max-w-[200px]">
            <span className="block font-sans-ui text-[9px] font-bold uppercase tracking-widest text-stone-500 mb-1">
              VOL. I · NO. 104
            </span>
            <span>Live Dispatch from Sikkim</span><br />
            <span>Gangtok to Pelling · Rain & Fog</span>
          </div>

          {/* Centered Nameplate */}
          <div className="text-center flex-1">
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <span className="live-dot" />
              <span className="font-sans-ui text-[10px] font-semibold uppercase tracking-wider text-stone-600">
                Live News feed
              </span>
            </div>
            <h1 className="font-serif-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-none uppercase select-none">
              The Sikkim Dispatch
            </h1>
            <p className="text-[10px] md:text-[11px] uppercase tracking-[0.25em] font-sans-ui font-semibold text-stone-500 mt-2">
              Every local headline, compiled by the hour with print precision
            </p>
          </div>

          {/* Right Ear: Scrape stats */}
          <div className="hidden md:block ear-text text-right max-w-[200px]">
            <span className="block font-sans-ui text-[9px] font-bold uppercase tracking-widest text-stone-500 mb-1">
              SCRAPE STATUS
            </span>
            <span>
              {status?.last_run_at
                ? format(parseISO(status.last_run_at), "d MMM, HH:mm")
                : "Awaiting Scrape"}{" "}
              UTC
            </span>
            <br />
            <span className="text-stone-400">Active background schedules</span>
          </div>
        </div>

        {/* Scrubber and Date Controller line */}
        <div className="mt-4 border-y-2 border-stone-900 py-2.5 flex flex-col md:flex-row items-center justify-between gap-4 font-sans-ui text-xs font-semibold uppercase tracking-wider">
          <div className="flex items-center gap-1">
            <button
              onClick={goPrev}
              className="rounded-none border border-stone-300 h-8 w-8 hover:bg-stone-900 hover:text-white flex items-center justify-center cursor-pointer transition-colors duration-150"
            >
              <ChevronLeft className="size-4" />
            </button>

            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button
                  className="rounded-none border border-stone-300 font-sans-ui font-bold uppercase tracking-wider text-[10px] px-4 h-8 flex items-center justify-center gap-2 cursor-pointer hover:bg-stone-100 transition-colors duration-150"
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {format(selectedDate, "eee, d MMM yyyy")}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-none border-stone-300" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => {
                    if (d) setSelectedDate(d);
                    setCalendarOpen(false);
                  }}
                  disabled={(date) => isFuture(date) && !isToday(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <button
              onClick={goNext}
              disabled={nextDisabled}
              className="rounded-none border border-stone-300 h-8 w-8 hover:bg-stone-900 hover:text-white flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Center Date Headline */}
          <div className="hidden md:block font-serif-display font-medium text-lg capitalize tracking-normal text-stone-950">
            {format(selectedDate, "eeee, MMMM d, yyyy")} · <span className="font-sans-ui text-xs font-bold uppercase tracking-widest text-stone-500">{articles.length} dispatches</span>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing || status?.is_running}
            className="refresh-button rounded-none"
          >
            <RefreshCcw
              className={`h-3.5 w-3.5 ${status?.is_running ? "animate-spin" : ""}`}
            />
            {status?.is_running ? "Scraping..." : "Refresh"}
          </button>
        </div>

        {/* Elegant Centered Print Category Menu */}
        <div className="my-3 overflow-x-auto scrollbar-hide flex items-center justify-start md:justify-center gap-1 md:gap-3 py-1 border-b border-stone-200">
          {CATEGORIES.map((cat, idx) => (
            <React.Fragment key={cat}>
              {idx > 0 && <span className="text-stone-300 select-none text-xs">·</span>}
              <button
                onClick={() => setCategory(cat)}
                data-active={category === cat}
                className="print-cat-btn"
              >
                {cat}
              </button>
            </React.Fragment>
          ))}
        </div>
      </header>

      {/* Main Front Page Body layout */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-6">
        {loading ? (
          <div className="space-y-10">
            <Skeleton className="h-[250px] w-full rounded-none" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {SKELETON_KEYS.map((k) => (
                <Skeleton key={k} className="h-[180px] w-full rounded-none" />
              ))}
            </div>
          </div>
        ) : articles.length === 0 ? (
          <div className="py-20 text-center border border-dashed border-stone-300">
            <Newspaper className="size-12 mx-auto text-stone-400 mb-4" />
            <h3 className="font-serif-display text-2xl font-bold mb-2">
              No dispatches filed for this date
            </h3>
            <p className="text-stone-600 font-sans-ui text-sm max-w-sm mx-auto">
              Please select another date, refine your category search, or run a refresh to fetch latest dispatches.
            </p>
          </div>
        ) : (
          <div className="fade-in lg:grid lg:grid-cols-12 lg:gap-12">

            {/* Left Stream: Main headlines (Hero and Grid) */}
            <div className="lg:col-span-9">
              <div className="mb-6 flex items-center justify-between text-[10px] font-sans-ui uppercase tracking-wider text-stone-500 font-bold border-b border-stone-200 pb-2 select-none">
                <span>Filed under: {category}</span>
                <span>{articles.length} Dispatches Available</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
                {articles.map((article, idx) => (
                  <NewsCard key={article.id} article={article} index={idx} />
                ))}
              </div>
            </div>

            {/* Right Sidebar: Scannable Bulletins (Classical Column Rule) */}
            <div className="hidden lg:block lg:col-span-3 border-l border-stone-200 pl-8">
              <div className="sticky top-6">
                <h4 className="font-serif-display text-xl font-bold tracking-tight uppercase border-b-2 border-stone-900 pb-1.5 mb-4 select-none">
                  Brief Bulletins
                </h4>
                <div className="space-y-5">
                  {articles.slice(0, 8).map((article) => (
                    <a
                      key={"brief-" + article.id}
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group border-b border-dashed border-stone-200 pb-3 last:border-b-0"
                    >
                      <span className="block eyebrow text-[8.5px] font-bold text-stone-400 mb-1">
                        {article.source} · {formatPublishedAt(article.published_at, "HH:mm") || "00:00"}
                      </span>
                      <h5 className="font-serif-display text-base font-semibold leading-snug group-hover:text-stone-600 transition-colors">
                        {article.title}
                      </h5>
                    </a>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}
      </main>

      <footer className="border-t-2 border-stone-900 mt-20 bg-stone-50/50 py-12 font-sans-ui">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">

          {/* Editorial & Legal Masthead Box */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-b border-stone-200 pb-10 mb-8 text-[11px] leading-relaxed text-stone-600">
            <div className="lg:col-span-4 border-r border-stone-200 pr-8">
              <h5 className="font-serif-display text-base font-bold italic text-stone-900 mb-2 select-none">
                The Sikkim Dispatch
              </h5>
              <p className="mb-3">
                A digital-first regional news directory and lexical keyword scorer compiling headlines, weather summaries, and real-time updates from established networks across the state of Sikkim.
              </p>
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest block mt-4">
                © {new Date().getFullYear()} Sikkim News Network · Vol. I No. 104
              </span>
            </div>

            <div className="lg:col-span-8">
              <h6 className="text-[10px] font-bold uppercase tracking-widest text-stone-900 mb-2">
                Fair Use & Legal Disclaimer
              </h6>
              <p className="mb-4">
                <strong>Source Material Attribution:</strong> This platform operates exclusively as a non-commercial, public-interest news directory and automated search aggregator. All headlines, snippets, publication dates, and source identities displayed here are the exclusive intellectual property of their original publishers (including <em>Sikkim Express, News on AIR, MSN, Instagram</em>, and others).
              </p>
              <p>
                <strong>Outbound Redirection & Take-down Policy:</strong> To read the full text of any dispatch, users are redirected via direct hyperlink to the original publisher’s host domain, driving direct traffic to their respective platforms. In compliance with fair use principles and the Digital Millennium Copyright Act (DMCA), if you are a publisher and wish to request the exclusion of your feed or report an attribution issue, please contact our editorial desk immediately at <a href="mailto:editor@sikkimdispatch.com" className="underline hover:text-stone-950 font-semibold text-stone-800">editor@sikkimdispatch.com</a>.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="font-serif-display text-xl font-bold italic tracking-tight">
              The Sikkim Dispatch
            </div>
            <div className="flex items-center gap-6 text-[10px] text-stone-400 font-bold uppercase tracking-wider">
              <span>Attributed Directory</span>
              <span>·</span>
              <span>Lexical Aggregation System</span>
              <span>·</span>
              <span>Non-Commercial Public Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};


const ArticleMeta = ({ article, compact, onTranslate, isNepali, translating }) => {
  return (
    <div className={`mt-5 flex items-center justify-between font-sans-ui ${compact ? "mt-4" : ""}`}>
      <div className="flex flex-col">
        <span className="text-[9px] uppercase tracking-widest font-bold text-stone-900 mb-0.5">
          {article.source}
        </span>
        <div className="flex items-center gap-1.5 text-stone-400 text-[9px] uppercase tracking-wider font-semibold">
          <Clock className="size-3" />
          <span>{formatPublishedAt(article.published_at, "d MMM · HH:mm")}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Translation Toggle Trigger */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onTranslate(e);
          }}
          disabled={translating}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-[9px] font-bold uppercase tracking-wider text-stone-700 hover:text-stone-950 transition-colors disabled:opacity-50 select-none cursor-pointer"
        >
          <Languages className={`size-3 text-stone-500 ${translating ? "animate-pulse" : ""}`} />
          {translating ? "Translating..." : isNepali ? "Show English" : "नेपालीमा"}
        </button>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <ExternalLink className="size-3.5 text-stone-500" />
        </div>
      </div>
    </div>
  );
};

const NewsCard = ({ article, index }) => {
  const [translatedTitle, setTranslatedTitle] = useState("");
  const [translatedSummary, setTranslatedSummary] = useState("");
  const [isNepali, setIsNepali] = useState(false);
  const [translating, setTranslating] = useState(false);

  const handleTranslate = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isNepali) {
      setIsNepali(false);
      return;
    }

    if (translatedTitle) {
      setIsNepali(true);
      return;
    }

    setTranslating(true);
    try {
      const [tTitle, tSummary] = await Promise.all([
        translateText(article.title),
        translateText(article.summary || article.description || "")
      ]);
      setTranslatedTitle(tTitle);
      setTranslatedSummary(tSummary);
      setIsNepali(true);
      toast.success("नेपालीमा अनुवाद गरियो!");
    } catch (err) {
      console.error(err);
      toast.error("Translation failed. Please try again.");
    } finally {
      setTranslating(false);
    }
  };

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="news-card block group"
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
      data-testid={`news-card-${article.id}`}
    >
      <div>
        <Badge
          variant="outline"
          className="mb-3 rounded-none border-stone-900 text-stone-900 bg-stone-50/50 uppercase tracking-widest text-[9px] font-bold"
        >
          {article.category}
        </Badge>
        <h3 className={`font-serif-display text-xl md:text-2xl font-bold leading-snug tracking-tight ${isNepali ? "font-sans-ui text-lg md:text-xl" : ""}`}>
          <span className="headline-link">{isNepali ? translatedTitle : article.title}</span>
        </h3>
        {(isNepali ? translatedSummary : article.summary) && (
          <p className={`mt-3 text-stone-600 text-sm leading-relaxed line-clamp-3 ${isNepali ? "font-sans-ui" : "font-serif-display"}`}>
            {isNepali ? translatedSummary : article.summary}
          </p>
        )}
        <ArticleMeta
          article={article}
          compact
          onTranslate={handleTranslate}
          isNepali={isNepali}
          translating={translating}
        />
      </div>
    </a>
  );
};

export default NewsPage;
