import type {
  CommunityAnnouncement,
  CommunityCaseGender,
  CommunityCaseShare,
  CommunityDashboardData,
  CommunityDiscussionCategory,
  CommunityDiscussionComment,
  CommunityDiscussionPost,
  CommunityEvent,
  CommunityKnowledgeItem,
  CommunityLikeTarget,
  CommunityMessage,
  CommunityMessageThread,
} from "@/lib/community/types";
import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const LOCAL_STORAGE_KEY = "swij-community-v1";

type LocalStore = {
  announcements: CommunityAnnouncement[];
  discussions: CommunityDiscussionPost[];
  comments: CommunityDiscussionComment[];
  cases: CommunityCaseShare[];
  knowledge: CommunityKnowledgeItem[];
  events: CommunityEvent[];
  messageThreads: CommunityMessageThread[];
  messages: CommunityMessage[];
  likes: { userId: string; targetType: CommunityLikeTarget; targetId: string }[];
};

type SupabaseAuth = {
  supabase: NonNullable<ReturnType<typeof createBrowserClient>>;
  userId: string;
  displayName: string;
};

async function getSupabaseAuth(): Promise<SupabaseAuth | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createBrowserClient();
  if (!supabase) return null;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  const role =
    profile && typeof profile === "object" && "role" in profile
      ? String((profile as { role?: unknown }).role ?? "")
      : "";
  if (role === "client") {
    throw new Error("コミュニティは認定講師のみ利用できます");
  }

  const displayName =
    profile &&
    typeof profile === "object" &&
    "display_name" in profile &&
    typeof (profile as { display_name?: unknown }).display_name === "string"
      ? ((profile as { display_name: string }).display_name || "認定講師")
      : "認定講師";

  return { supabase, userId: user.id, displayName };
}

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `cm-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function seedDemoStore(userId: string): LocalStore {
  const now = Date.now();
  const iso = (daysAgo: number, hour = 10) => {
    const d = new Date(now - daysAgo * 86400000);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  const future = (daysAhead: number, hour = 19) => {
    const d = new Date(now + daysAhead * 86400000);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  const announcements: CommunityAnnouncement[] = [
    {
      id: "ann-1",
      category: "update",
      title: "Sleep Wellness Platform V2.0 コミュニティ公開",
      body: "認定講師同士が学び・相談・情報共有できる SWIJ Community を公開しました。お知らせ・ディスカッション・ケース共有からご利用ください。",
      publishedAt: iso(1),
      pinned: true,
      authorName: "SWIJ本部",
    },
    {
      id: "ann-2",
      category: "study",
      title: "8月 睡眠科学勉強会（オンライン）開催案内",
      body: "テーマは「概日リズムとメラトニン分泌」。Zoomにて開催。詳細はイベントタブをご確認ください。",
      publishedAt: iso(3),
      pinned: false,
      authorName: "SWIJ本部",
    },
    {
      id: "ann-3",
      category: "research",
      title: "第3回 睡眠ウェルネス研究会 — 抄録募集",
      body: "事例報告・介入研究の抄録を募集しています。締切は開催2週間前まで。",
      publishedAt: iso(7),
      pinned: false,
      authorName: "SWIJ本部",
    },
    {
      id: "ann-4",
      category: "event",
      title: "秋のメラトニンヨガ™リトリート 先行案内",
      body: "自然のなかで睡眠科学と実践を深める2日間。定員に達し次第締め切ります。",
      publishedAt: iso(12),
      pinned: false,
      authorName: "SWIJ本部",
    },
  ];

  const discussions: CommunityDiscussionPost[] = [
    {
      id: "disc-1",
      authorId: "peer-1",
      authorName: "佐藤 美咲",
      category: "sleep_science",
      title: "就寝前のブルーライト対策、現場での説明トーク",
      body: "クライアントへ「なぜスクリーン制限が効くのか」を短く伝えるときの言い回しを共有したいです。皆さんはどう説明していますか？",
      likeCount: 8,
      commentCount: 2,
      likedByMe: false,
      createdAt: iso(2, 14),
      updatedAt: iso(2, 14),
    },
    {
      id: "disc-2",
      authorId: "peer-2",
      authorName: "田中 健",
      category: "melatonin_yoga",
      title: "メラトニンヨガ™ 夜クラスの導入フロー",
      body: "初回90分の流れ（呼吸→ゆるめ→陰→クロージング）を整理しました。改善案があれば教えてください。",
      likeCount: 12,
      commentCount: 1,
      likedByMe: true,
      createdAt: iso(4, 11),
      updatedAt: iso(4, 11),
    },
    {
      id: "disc-3",
      authorId: userId,
      authorName: "あなた",
      category: "case_consult",
      title: "シフト勤務の入眠困難 — 介入の優先順位",
      body: "夜勤明けの入眠が不安定なケース。光・食事・呼吸のどれから入るのがよいか相談です。",
      likeCount: 3,
      commentCount: 0,
      likedByMe: false,
      createdAt: iso(5, 16),
      updatedAt: iso(5, 16),
    },
    {
      id: "disc-4",
      authorId: "peer-3",
      authorName: "鈴木 あかり",
      category: "enterprise",
      title: "企業向けウェルネス講座のKPI設計",
      body: "継続率・睡眠スコア・主観満足度のどれを主指標にするか、導入事例があれば共有ください。",
      likeCount: 5,
      commentCount: 0,
      likedByMe: false,
      createdAt: iso(8, 9),
      updatedAt: iso(8, 9),
    },
  ];

  const comments: CommunityDiscussionComment[] = [
    {
      id: "cmt-1",
      postId: "disc-1",
      authorId: "peer-2",
      authorName: "田中 健",
      parentId: null,
      body: "「メラトニンは暗さでスイッチが入る」と比喩で伝えると納得されやすいです。",
      likeCount: 4,
      likedByMe: false,
      createdAt: iso(2, 15),
    },
    {
      id: "cmt-2",
      postId: "disc-1",
      authorId: userId,
      authorName: "あなた",
      parentId: "cmt-1",
      body: "比喩いいですね。ワンポイントカードにまとめようと思います。",
      likeCount: 1,
      likedByMe: false,
      createdAt: iso(2, 16),
    },
    {
      id: "cmt-3",
      postId: "disc-2",
      authorId: "peer-1",
      authorName: "佐藤 美咲",
      parentId: null,
      body: "クロージング前に2分のボディスキャンを入れると満足度が上がりました。",
      likeCount: 6,
      likedByMe: true,
      createdAt: iso(4, 12),
    },
  ];

  const cases: CommunityCaseShare[] = [
    {
      id: "case-1",
      authorId: "peer-1",
      authorName: "佐藤 美咲",
      ageBand: "40代",
      gender: "female",
      challenge: "中途覚醒が多く、日中の集中力が低下。",
      intervention:
        "就寝90分前のスクリーン制限、メラトニンヨガ™夜クラス週2、カフェインカットオフを14時に設定。",
      outcome: "4週後、中途覚醒が週5→週1へ。主観的睡眠の質が改善。",
      attachmentNote: null,
      likeCount: 9,
      likedByMe: false,
      createdAt: iso(6, 10),
    },
    {
      id: "case-2",
      authorId: "peer-3",
      authorName: "鈴木 あかり",
      ageBand: "30代",
      gender: "male",
      challenge: "入眠潜時が長い。仕事の反芻思考が強い。",
      intervention:
        "ベッド外での心配事リスト、呼吸法（4-7-8）、就寝ルーティンの固定化。",
      outcome: "3週で入眠潜時が平均45分→20分程度に短縮。",
      attachmentNote: "図表は将来の画像添付で共有予定",
      likeCount: 4,
      likedByMe: false,
      createdAt: iso(10, 13),
    },
  ];

  const knowledge: CommunityKnowledgeItem[] = [
    {
      id: "know-1",
      type: "pdf",
      title: "睡眠ウェルネス指導ガイドライン（抜粋）",
      description: "初回カウンセリング〜フォローまでの標準フロー。",
      tags: ["ガイドライン", "カウンセリング"],
      href: null,
      publishedAt: iso(20),
    },
    {
      id: "know-2",
      type: "video",
      title: "メラトニンヨガ™ 基礎シーケンス解説",
      description: "夜クラス向けの基本シークエンス（約18分）。",
      tags: ["メラトニンヨガ", "指導"],
      href: null,
      publishedAt: iso(15),
    },
    {
      id: "know-3",
      type: "template",
      title: "企業導入提案書テンプレート",
      description: "課題仮説・KPI・プログラム構成の雛形。",
      tags: ["企業", "提案"],
      href: null,
      publishedAt: iso(25),
    },
    {
      id: "know-4",
      type: "research",
      title: "概日リズムと光曝露 — レビュー要約",
      description: "現場説明に使える研究ハイライト集。",
      tags: ["睡眠科学", "光"],
      href: null,
      publishedAt: iso(30),
    },
  ];

  const events: CommunityEvent[] = [
    {
      id: "evt-1",
      type: "study",
      title: "睡眠科学勉強会 — 概日リズム編",
      description: "オンライン勉強会。質疑応答あり。",
      startsAt: future(14, 19),
      endsAt: future(14, 21),
      location: "Zoom",
      capacity: 80,
      registrationUrl: null,
    },
    {
      id: "evt-2",
      type: "zoom",
      title: "ケース相談会（月例）",
      description: "匿名化したケースを持ち寄り、先輩講師と相談。",
      startsAt: future(21, 20),
      endsAt: future(21, 21),
      location: "Zoom",
      capacity: 40,
      registrationUrl: null,
    },
    {
      id: "evt-3",
      type: "retreat",
      title: "秋のメラトニンヨガ™リトリート",
      description: "2日間の実践と睡眠科学インプット。",
      startsAt: future(60, 10),
      endsAt: future(61, 15),
      location: "山梨（会場詳細は追って案内）",
      capacity: 24,
      registrationUrl: null,
    },
    {
      id: "evt-4",
      type: "training",
      title: "メラトニンヨガ™養成講座（後期）",
      description: "認定取得に向けた集中養成プログラム。",
      startsAt: future(45, 9),
      endsAt: future(47, 17),
      location: "東京（ハイブリッド）",
      capacity: 30,
      registrationUrl: null,
    },
  ];

  const messageThreads: CommunityMessageThread[] = [
    {
      id: "msg-th-1",
      peerName: "佐藤 美咲",
      peerRole: "認定講師",
      lastMessage: "勉強会の資料、共有ありがとうございます。",
      lastAt: iso(1, 18),
      unread: 1,
    },
    {
      id: "msg-th-2",
      peerName: "田中 健",
      peerRole: "認定講師",
      lastMessage: "ケース相談の件、来週のZoomで。",
      lastAt: iso(3, 12),
      unread: 0,
    },
  ];

  const messages: CommunityMessage[] = [
    {
      id: "msg-1",
      threadId: "msg-th-1",
      fromMe: false,
      body: "先日の勉強会資料、拝見しました。とても分かりやすかったです。",
      sentAt: iso(1, 17),
    },
    {
      id: "msg-2",
      threadId: "msg-th-1",
      fromMe: true,
      body: "ありがとうございます。必要なら追記版も送りますね。",
      sentAt: iso(1, 17),
    },
    {
      id: "msg-3",
      threadId: "msg-th-1",
      fromMe: false,
      body: "勉強会の資料、共有ありがとうございます。",
      sentAt: iso(1, 18),
    },
  ];

  return {
    announcements,
    discussions,
    comments,
    cases,
    knowledge,
    events,
    messageThreads,
    messages,
    likes: [
      { userId, targetType: "discussion_post", targetId: "disc-2" },
      { userId, targetType: "discussion_comment", targetId: "cmt-3" },
    ],
  };
}

function readLocal(userId: string): LocalStore {
  if (!canUseLocalStorage()) return seedDemoStore(userId);
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      const seeded = seedDemoStore(userId);
      writeLocal(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw) as LocalStore;
    return {
      announcements: Array.isArray(parsed.announcements)
        ? parsed.announcements
        : [],
      discussions: Array.isArray(parsed.discussions) ? parsed.discussions : [],
      comments: Array.isArray(parsed.comments) ? parsed.comments : [],
      cases: Array.isArray(parsed.cases) ? parsed.cases : [],
      knowledge: Array.isArray(parsed.knowledge) ? parsed.knowledge : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
      messageThreads: Array.isArray(parsed.messageThreads)
        ? parsed.messageThreads
        : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      likes: Array.isArray(parsed.likes) ? parsed.likes : [],
    };
  } catch {
    return seedDemoStore(userId);
  }
}

function writeLocal(store: LocalStore): void {
  if (!canUseLocalStorage()) return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
}

function applyLikes<T extends { id: string; likeCount: number; likedByMe: boolean }>(
  items: T[],
  store: LocalStore,
  userId: string,
  targetType: CommunityLikeTarget,
): T[] {
  return items.map((item) => {
    const likedByMe = store.likes.some(
      (like) =>
        like.userId === userId &&
        like.targetType === targetType &&
        like.targetId === item.id,
    );
    return { ...item, likedByMe };
  });
}

function localUserId(): string {
  return "demo-instructor";
}

export async function loadCommunityDashboard(): Promise<CommunityDashboardData> {
  const auth = await getSupabaseAuth().catch((err) => {
    if (err instanceof Error && err.message.includes("認定講師")) throw err;
    return null;
  });

  if (!auth) {
    const userId = localUserId();
    const store = readLocal(userId);
    return {
      displayName: "認定講師（デモ）",
      announcements: [...store.announcements].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.publishedAt.localeCompare(a.publishedAt);
      }),
      discussions: applyLikes(
        [...store.discussions].sort((a, b) =>
          b.createdAt.localeCompare(a.createdAt),
        ),
        store,
        userId,
        "discussion_post",
      ),
      cases: applyLikes(
        [...store.cases].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        store,
        userId,
        "case",
      ),
      knowledge: [...store.knowledge].sort((a, b) =>
        b.publishedAt.localeCompare(a.publishedAt),
      ),
      events: [...store.events].sort((a, b) =>
        a.startsAt.localeCompare(b.startsAt),
      ),
      messageThreads: [...store.messageThreads].sort((a, b) =>
        b.lastAt.localeCompare(a.lastAt),
      ),
    };
  }

  try {
    const [
      announcementsRes,
      discussionsRes,
      casesRes,
      knowledgeRes,
      eventsRes,
      likesRes,
    ] = await Promise.all([
      auth.supabase
        .from("community_announcements")
        .select("*")
        .order("pinned", { ascending: false })
        .order("published_at", { ascending: false }),
      auth.supabase
        .from("community_discussion_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      auth.supabase
        .from("community_case_shares")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      auth.supabase
        .from("community_knowledge_items")
        .select("*")
        .order("published_at", { ascending: false }),
      auth.supabase
        .from("community_events")
        .select("*")
        .order("starts_at", { ascending: true }),
      auth.supabase
        .from("community_likes")
        .select("target_type, target_id")
        .eq("user_id", auth.userId),
    ]);

    if (
      announcementsRes.error ||
      discussionsRes.error ||
      casesRes.error ||
      knowledgeRes.error ||
      eventsRes.error
    ) {
      // tables missing → demo fallback
      const store = readLocal(auth.userId);
      return {
        displayName: auth.displayName,
        announcements: store.announcements,
        discussions: applyLikes(
          store.discussions,
          store,
          auth.userId,
          "discussion_post",
        ),
        cases: applyLikes(store.cases, store, auth.userId, "case"),
        knowledge: store.knowledge,
        events: store.events,
        messageThreads: store.messageThreads,
      };
    }

    const myLikes = new Set(
      (likesRes.data ?? []).map(
        (row: { target_type: string; target_id: string }) =>
          `${row.target_type}:${row.target_id}`,
      ),
    );

    const announcements: CommunityAnnouncement[] = (
      announcementsRes.data ?? []
    ).map(
      (row: {
        id: string;
        category: string;
        title: string;
        body: string;
        published_at: string;
        pinned: boolean;
        author_name: string;
      }) => ({
        id: row.id,
        category: row.category as CommunityAnnouncement["category"],
        title: row.title,
        body: row.body,
        publishedAt: row.published_at,
        pinned: row.pinned,
        authorName: row.author_name,
      }),
    );

    const discussions: CommunityDiscussionPost[] = (
      discussionsRes.data ?? []
    ).map(
      (row: {
        id: string;
        author_id: string;
        author_name: string;
        category: string;
        title: string;
        body: string;
        like_count: number;
        comment_count: number;
        created_at: string;
        updated_at: string;
      }) => ({
        id: row.id,
        authorId: row.author_id,
        authorName: row.author_name,
        category: row.category as CommunityDiscussionCategory,
        title: row.title,
        body: row.body,
        likeCount: row.like_count,
        commentCount: row.comment_count,
        likedByMe: myLikes.has(`discussion_post:${row.id}`),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }),
    );

    const cases: CommunityCaseShare[] = (casesRes.data ?? []).map(
      (row: {
        id: string;
        author_id: string;
        author_name: string;
        age_band: string;
        gender: string;
        challenge: string;
        intervention: string;
        outcome: string;
        attachment_note: string | null;
        like_count: number;
        created_at: string;
      }) => ({
        id: row.id,
        authorId: row.author_id,
        authorName: row.author_name,
        ageBand: row.age_band,
        gender: row.gender as CommunityCaseGender,
        challenge: row.challenge,
        intervention: row.intervention,
        outcome: row.outcome,
        attachmentNote: row.attachment_note,
        likeCount: row.like_count,
        likedByMe: myLikes.has(`case:${row.id}`),
        createdAt: row.created_at,
      }),
    );

    const knowledge: CommunityKnowledgeItem[] = (knowledgeRes.data ?? []).map(
      (row: {
        id: string;
        type: string;
        title: string;
        description: string;
        tags: string[] | null;
        href: string | null;
        published_at: string;
      }) => ({
        id: row.id,
        type: row.type as CommunityKnowledgeItem["type"],
        title: row.title,
        description: row.description,
        tags: row.tags ?? [],
        href: row.href,
        publishedAt: row.published_at,
      }),
    );

    const events: CommunityEvent[] = (eventsRes.data ?? []).map(
      (row: {
        id: string;
        type: string;
        title: string;
        description: string;
        starts_at: string;
        ends_at: string | null;
        location: string;
        capacity: number | null;
        registration_url: string | null;
      }) => ({
        id: row.id,
        type: row.type as CommunityEvent["type"],
        title: row.title,
        description: row.description,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        location: row.location,
        capacity: row.capacity,
        registrationUrl: row.registration_url,
      }),
    );

    // Messages remain demo-backed in V2.0
    const store = readLocal(auth.userId);

    return {
      displayName: auth.displayName,
      announcements,
      discussions,
      cases,
      knowledge,
      events,
      messageThreads: store.messageThreads,
    };
  } catch {
    const store = readLocal(auth.userId);
    return {
      displayName: auth.displayName,
      announcements: store.announcements,
      discussions: applyLikes(
        store.discussions,
        store,
        auth.userId,
        "discussion_post",
      ),
      cases: applyLikes(store.cases, store, auth.userId, "case"),
      knowledge: store.knowledge,
      events: store.events,
      messageThreads: store.messageThreads,
    };
  }
}

export async function createDiscussionPost(input: {
  category: CommunityDiscussionCategory;
  title: string;
  body: string;
}): Promise<CommunityDiscussionPost> {
  const auth = await getSupabaseAuth().catch(() => null);
  const now = new Date().toISOString();

  if (!auth) {
    const userId = localUserId();
    const store = readLocal(userId);
    const post: CommunityDiscussionPost = {
      id: createId(),
      authorId: userId,
      authorName: "あなた",
      category: input.category,
      title: input.title.trim(),
      body: input.body.trim(),
      likeCount: 0,
      commentCount: 0,
      likedByMe: false,
      createdAt: now,
      updatedAt: now,
    };
    store.discussions.unshift(post);
    writeLocal(store);
    return post;
  }

  const { data, error } = await auth.supabase
    .from("community_discussion_posts")
    .insert({
      author_id: auth.userId,
      author_name: auth.displayName,
      category: input.category,
      title: input.title.trim(),
      body: input.body.trim(),
    })
    .select("*")
    .single();

  if (error || !data) {
    // fallback local
    const store = readLocal(auth.userId);
    const post: CommunityDiscussionPost = {
      id: createId(),
      authorId: auth.userId,
      authorName: auth.displayName,
      category: input.category,
      title: input.title.trim(),
      body: input.body.trim(),
      likeCount: 0,
      commentCount: 0,
      likedByMe: false,
      createdAt: now,
      updatedAt: now,
    };
    store.discussions.unshift(post);
    writeLocal(store);
    return post;
  }

  return {
    id: data.id,
    authorId: data.author_id,
    authorName: data.author_name,
    category: data.category as CommunityDiscussionCategory,
    title: data.title,
    body: data.body,
    likeCount: data.like_count,
    commentCount: data.comment_count,
    likedByMe: false,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function loadDiscussionDetail(postId: string): Promise<{
  post: CommunityDiscussionPost;
  comments: CommunityDiscussionComment[];
} | null> {
  const auth = await getSupabaseAuth().catch(() => null);
  const userId = auth?.userId ?? localUserId();

  if (!auth) {
    const store = readLocal(userId);
    const post = store.discussions.find((item) => item.id === postId);
    if (!post) return null;
    const comments = applyLikes(
      store.comments
        .filter((c) => c.postId === postId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      store,
      userId,
      "discussion_comment",
    );
    return {
      post: applyLikes([post], store, userId, "discussion_post")[0],
      comments,
    };
  }

  const { data: postRow, error } = await auth.supabase
    .from("community_discussion_posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();

  if (error || !postRow) {
    const store = readLocal(userId);
    const post = store.discussions.find((item) => item.id === postId);
    if (!post) return null;
    return {
      post: applyLikes([post], store, userId, "discussion_post")[0],
      comments: applyLikes(
        store.comments.filter((c) => c.postId === postId),
        store,
        userId,
        "discussion_comment",
      ),
    };
  }

  const [{ data: commentRows }, { data: likeRows }] = await Promise.all([
    auth.supabase
      .from("community_discussion_comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true }),
    auth.supabase
      .from("community_likes")
      .select("target_type, target_id")
      .eq("user_id", auth.userId),
  ]);

  const myLikes = new Set(
    (likeRows ?? []).map(
      (row: { target_type: string; target_id: string }) =>
        `${row.target_type}:${row.target_id}`,
    ),
  );

  const post: CommunityDiscussionPost = {
    id: postRow.id,
    authorId: postRow.author_id,
    authorName: postRow.author_name,
    category: postRow.category as CommunityDiscussionCategory,
    title: postRow.title,
    body: postRow.body,
    likeCount: postRow.like_count,
    commentCount: postRow.comment_count,
    likedByMe: myLikes.has(`discussion_post:${postRow.id}`),
    createdAt: postRow.created_at,
    updatedAt: postRow.updated_at,
  };

  const comments: CommunityDiscussionComment[] = (commentRows ?? []).map(
    (row: {
      id: string;
      post_id: string;
      author_id: string;
      author_name: string;
      parent_id: string | null;
      body: string;
      like_count: number;
      created_at: string;
    }) => ({
      id: row.id,
      postId: row.post_id,
      authorId: row.author_id,
      authorName: row.author_name,
      parentId: row.parent_id,
      body: row.body,
      likeCount: row.like_count,
      likedByMe: myLikes.has(`discussion_comment:${row.id}`),
      createdAt: row.created_at,
    }),
  );

  return { post, comments };
}

export async function addDiscussionComment(input: {
  postId: string;
  body: string;
  parentId?: string | null;
}): Promise<CommunityDiscussionComment> {
  const auth = await getSupabaseAuth().catch(() => null);
  const now = new Date().toISOString();
  const userId = auth?.userId ?? localUserId();
  const authorName = auth?.displayName ?? "あなた";

  if (!auth) {
    const store = readLocal(userId);
    const comment: CommunityDiscussionComment = {
      id: createId(),
      postId: input.postId,
      authorId: userId,
      authorName,
      parentId: input.parentId ?? null,
      body: input.body.trim(),
      likeCount: 0,
      likedByMe: false,
      createdAt: now,
    };
    store.comments.push(comment);
    const post = store.discussions.find((p) => p.id === input.postId);
    if (post) post.commentCount += 1;
    writeLocal(store);
    return comment;
  }

  const { data, error } = await auth.supabase
    .from("community_discussion_comments")
    .insert({
      post_id: input.postId,
      author_id: auth.userId,
      author_name: authorName,
      parent_id: input.parentId ?? null,
      body: input.body.trim(),
    })
    .select("*")
    .single();

  if (error || !data) {
    const store = readLocal(userId);
    const comment: CommunityDiscussionComment = {
      id: createId(),
      postId: input.postId,
      authorId: userId,
      authorName,
      parentId: input.parentId ?? null,
      body: input.body.trim(),
      likeCount: 0,
      likedByMe: false,
      createdAt: now,
    };
    store.comments.push(comment);
    writeLocal(store);
    return comment;
  }

  // best-effort comment_count bump
  const { data: postRow } = await auth.supabase
    .from("community_discussion_posts")
    .select("comment_count")
    .eq("id", input.postId)
    .maybeSingle();
  if (postRow) {
    await auth.supabase
      .from("community_discussion_posts")
      .update({ comment_count: (postRow.comment_count ?? 0) + 1 })
      .eq("id", input.postId);
  }

  return {
    id: data.id,
    postId: data.post_id,
    authorId: data.author_id,
    authorName: data.author_name,
    parentId: data.parent_id,
    body: data.body,
    likeCount: data.like_count,
    likedByMe: false,
    createdAt: data.created_at,
  };
}

export async function createCaseShare(input: {
  ageBand: string;
  gender: CommunityCaseGender;
  challenge: string;
  intervention: string;
  outcome: string;
  attachmentNote?: string;
}): Promise<CommunityCaseShare> {
  const auth = await getSupabaseAuth().catch(() => null);
  const now = new Date().toISOString();
  const userId = auth?.userId ?? localUserId();
  const authorName = auth?.displayName ?? "あなた";

  const localCreate = () => {
    const store = readLocal(userId);
    const item: CommunityCaseShare = {
      id: createId(),
      authorId: userId,
      authorName,
      ageBand: input.ageBand,
      gender: input.gender,
      challenge: input.challenge.trim(),
      intervention: input.intervention.trim(),
      outcome: input.outcome.trim(),
      attachmentNote: input.attachmentNote?.trim() || null,
      likeCount: 0,
      likedByMe: false,
      createdAt: now,
    };
    store.cases.unshift(item);
    writeLocal(store);
    return item;
  };

  if (!auth) return localCreate();

  const { data, error } = await auth.supabase
    .from("community_case_shares")
    .insert({
      author_id: auth.userId,
      author_name: authorName,
      age_band: input.ageBand,
      gender: input.gender,
      challenge: input.challenge.trim(),
      intervention: input.intervention.trim(),
      outcome: input.outcome.trim(),
      attachment_note: input.attachmentNote?.trim() || null,
    })
    .select("*")
    .single();

  if (error || !data) return localCreate();

  return {
    id: data.id,
    authorId: data.author_id,
    authorName: data.author_name,
    ageBand: data.age_band,
    gender: data.gender as CommunityCaseGender,
    challenge: data.challenge,
    intervention: data.intervention,
    outcome: data.outcome,
    attachmentNote: data.attachment_note,
    likeCount: data.like_count,
    likedByMe: false,
    createdAt: data.created_at,
  };
}

export async function toggleLike(
  targetType: CommunityLikeTarget,
  targetId: string,
): Promise<{ liked: boolean; likeCount: number }> {
  const auth = await getSupabaseAuth().catch(() => null);
  const userId = auth?.userId ?? localUserId();

  const bumpLocal = (liked: boolean) => {
    const store = readLocal(userId);
    const existing = store.likes.find(
      (like) =>
        like.userId === userId &&
        like.targetType === targetType &&
        like.targetId === targetId,
    );
    let likeCount = 0;

    const updateCount = <T extends { id: string; likeCount: number }>(
      list: T[],
      delta: number,
    ) => {
      const item = list.find((entry) => entry.id === targetId);
      if (item) {
        item.likeCount = Math.max(0, item.likeCount + delta);
        likeCount = item.likeCount;
      }
    };

    if (existing && !liked) {
      // noop
    }

    if (existing) {
      store.likes = store.likes.filter((like) => like !== existing);
      if (targetType === "discussion_post") {
        updateCount(store.discussions, -1);
      } else if (targetType === "discussion_comment") {
        updateCount(store.comments, -1);
      } else {
        updateCount(store.cases, -1);
      }
      writeLocal(store);
      return { liked: false, likeCount };
    }

    store.likes.push({ userId, targetType, targetId });
    if (targetType === "discussion_post") {
      updateCount(store.discussions, 1);
    } else if (targetType === "discussion_comment") {
      updateCount(store.comments, 1);
    } else {
      updateCount(store.cases, 1);
    }
    writeLocal(store);
    return { liked: true, likeCount };
  };

  if (!auth) return bumpLocal(true);

  const { data: existing } = await auth.supabase
    .from("community_likes")
    .select("id")
    .eq("user_id", auth.userId)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle();

  const table =
    targetType === "discussion_post"
      ? "community_discussion_posts"
      : targetType === "discussion_comment"
        ? "community_discussion_comments"
        : "community_case_shares";

  if (existing) {
    await auth.supabase.from("community_likes").delete().eq("id", existing.id);
    const { data: row } = await auth.supabase
      .from(table)
      .select("like_count")
      .eq("id", targetId)
      .maybeSingle();
    const next = Math.max(0, (row?.like_count ?? 1) - 1);
    await auth.supabase.from(table).update({ like_count: next }).eq("id", targetId);
    return { liked: false, likeCount: next };
  }

  const { error } = await auth.supabase.from("community_likes").insert({
    user_id: auth.userId,
    target_type: targetType,
    target_id: targetId,
  });

  if (error) return bumpLocal(true);

  const { data: row } = await auth.supabase
    .from(table)
    .select("like_count")
    .eq("id", targetId)
    .maybeSingle();
  const next = (row?.like_count ?? 0) + 1;
  await auth.supabase.from(table).update({ like_count: next }).eq("id", targetId);
  return { liked: true, likeCount: next };
}

export async function loadMessageThread(
  threadId: string,
): Promise<CommunityMessage[]> {
  const userId = localUserId();
  const store = readLocal(userId);
  return store.messages
    .filter((m) => m.threadId === threadId)
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
}

export async function deleteCommunityContent(
  kind: "discussion" | "case" | "comment",
  id: string,
): Promise<void> {
  const auth = await getSupabaseAuth().catch(() => null);
  const userId = auth?.userId ?? localUserId();
  const store = readLocal(userId);

  if (kind === "discussion") {
    store.discussions = store.discussions.filter((item) => item.id !== id);
    store.comments = store.comments.filter((item) => item.postId !== id);
  } else if (kind === "case") {
    store.cases = store.cases.filter((item) => item.id !== id);
  } else {
    store.comments = store.comments.filter((item) => item.id !== id);
  }
  writeLocal(store);

  if (!auth) return;

  if (kind === "discussion") {
    await auth.supabase
      .from("community_discussion_posts")
      .delete()
      .eq("id", id);
  } else if (kind === "case") {
    await auth.supabase.from("community_case_shares").delete().eq("id", id);
  } else {
    await auth.supabase
      .from("community_discussion_comments")
      .delete()
      .eq("id", id);
  }
}

/** Admin overview from local/demo or DB counts. */
export async function loadAdminCommunityOverview(): Promise<{
  discussionCount: number;
  caseCount: number;
  announcementCount: number;
  knowledgeCount: number;
  eventCount: number;
  recentDiscussions: CommunityDiscussionPost[];
  recentCases: CommunityCaseShare[];
}> {
  // Server / demo without browser storage: use seeded snapshot
  if (!canUseLocalStorage()) {
    const store = seedDemoStore("demo-instructor");
    return {
      discussionCount: store.discussions.length,
      caseCount: store.cases.length,
      announcementCount: store.announcements.length,
      knowledgeCount: store.knowledge.length,
      eventCount: store.events.length,
      recentDiscussions: store.discussions.slice(0, 8),
      recentCases: store.cases.slice(0, 8),
    };
  }

  const data = await loadCommunityDashboard();
  return {
    discussionCount: data.discussions.length,
    caseCount: data.cases.length,
    announcementCount: data.announcements.length,
    knowledgeCount: data.knowledge.length,
    eventCount: data.events.length,
    recentDiscussions: data.discussions.slice(0, 8),
    recentCases: data.cases.slice(0, 8),
  };
}
