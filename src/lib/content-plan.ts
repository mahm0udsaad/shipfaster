/**
 * KINBO's content plan, held as data in the repo rather than in Postgres.
 *
 * The calendar was originally DB-backed (migration 0006 + `getContentCalendar`). That path
 * still exists, but the plan below is what /content renders today: the point right now is to
 * SHOW the plan to a client who has no login, and a static module does that with no auth, no
 * Supabase env, and no signed-URL round trip per thumbnail.
 *
 * Images are served straight from `public/kinbo/` — checked in beside this file so the page
 * works on a clean clone. Every slide path here must exist there; there is no fallback.
 *
 * When the DB comes back: this shape is deliberately a superset of a `content_posts` row, so
 * a seed script can walk `CONTENT_PLAN` and insert it as-is.
 */

export type PlanSlide = {
  /** Path under public/. Must start with '/kinbo/'. */
  src: string;
  /** What the slide shows — used as alt text and as the caption under the lightbox. */
  alt: string;
};

export type PlanPost = {
  id: string;
  /** Day slot, 'YYYY-MM-DD', in Cairo time. Paired with `time` to make `scheduledAt`. */
  day: string;
  /** 'HH:MM', Cairo. Evening slots: the audience is on their phone after work. */
  time: string;
  title: string;
  channel: 'instagram' | 'facebook' | 'tiktok';
  status: 'idea' | 'draft' | 'scheduled' | 'published';
  /** The one line that has to earn the scroll-stop. */
  hook: string;
  /** Why this post exists, in one phrase — the thing to judge it against afterwards. */
  goal: string;
  format: string;
  platforms: string;
  /** Publishable as-is. Arabic, because the audience is Egyptian. */
  caption: string;
  cta: string;
  /** Production notes for whoever assembles the carousel. Not published. */
  notes: string;
  /**
   * A non-empty tuple, not an array: slide 1 is the cover the grid and the list both render,
   * so "a post with no images" is a state the viewer should never have to handle. TypeScript
   * rejects the empty case here instead of the UI guarding against it in three places.
   */
  slides: [PlanSlide, ...PlanSlide[]];
};

/**
 * Cairo is UTC+03:00 year-round (Egypt's DST was dropped again in 2023), so a fixed offset is
 * honest here — no tz database needed to turn a slot into an instant.
 */
const CAIRO_OFFSET = '+03:00';

export function planScheduledAt(post: PlanPost): string {
  return new Date(`${post.day}T${post.time}:00${CAIRO_OFFSET}`).toISOString();
}

export const PLAN_PROJECT = 'KINBO Store';

/**
 * The month the calendar opens on when the URL carries no `?m=`. Pinned to the plan rather
 * than to `new Date()`: a visitor opening the link in a month with no posts would otherwise
 * be shown an empty grid and conclude the page is broken.
 */
export const PLAN_DEFAULT_MONTH = '2026-09';

/**
 * Every CTA below carries a second line beyond the post's own ask: invite the customer to
 * message about pieces not yet up on the page, so they see new stock before it's posted. One
 * string, reused everywhere, so that line stays word-for-word consistent across the plan
 * instead of drifting post to post.
 */
const ASK_ABOUT_UNLISTED_STOCK =
  'وعندنا كمان تيشيرتات وشورتات وقطع تانية لسه ما اتعرضتش هنا — ابعتلنا واتساب واسأل عليها، تبقى أول حد يشوفها.';

export const CONTENT_PLAN: PlanPost[] = [
  {
    id: 'kinbo-b2g1-launch',
    day: '2026-09-01',
    time: '20:00',
    title: 'العرض: اشتري ٢ تيشيرت وخد التالت هدية',
    channel: 'instagram',
    status: 'scheduled',
    hook: 'اشتري ٢ تيشيرت وخد التالت من اختيارك هدية.',
    goal: 'إعلان عرض Buy 2 Get 1 Free وتثبيته كأول بوست على البروفايل',
    format: 'Offer launch carousel · 4 slides · 1:1',
    platforms: 'Instagram Feed + Facebook',
    caption:
      'العرض اللي مستنينه وصل 🔥 اشتري ٢ تيشيرت وخد التالت من اختيارك هدية. اختار أي قطعتين من الدروب، والتالتة علينا. العرض لفترة محدودة، فمتأخرش. اسحب شوف التلات تيشيرتات اللي على الاستاند من قرب. التوصيل داخل القاهرة والجيزة. #KINBO #Buy2Get1 #ستريت_وير_مصر #عروض',
    cta: `WhatsApp بأسماء التلات تيشيرتات + المقاس. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes:
      'Slide 1 لقطة الاستاند الكاملة — دي الصورة اللي بتوقف السكرول وتوضح إن العرض على ٣ قطع. Slides 2–4 كل تيشيرت قريب لوحده بنفس ترتيب الاستاند. ثبّت البوست في أول خانة طول مدة العرض.',
    slides: [
      { src: '/kinbo/rack-trio-mimic-varsity-doozrre.jpg', alt: 'الاستاند الكامل: MIMIC نبيتي، VARSITY بيج، DOO ZRRE زيتي — التلاتة داخلين في عرض اشتري ٢ وخد التالت هدية' },
      { src: '/kinbo/tee-mimic-maroon.jpg', alt: 'تيشيرت MIMIC نبيتي بطبعة كريمي' },
      { src: '/kinbo/tee-varsity-sand.jpg', alt: 'تيشيرت VARSITY بيج بطبعة Keep dreaming' },
      { src: '/kinbo/tee-doozrre-olive.jpg', alt: 'تيشيرت DOO ZRRE زيتي بطبعة Hazard' },
    ],
  },
  {
    id: 'kinbo-b2g1-catalog',
    day: '2026-09-02',
    time: '19:00',
    title: 'دور على التالت بتاعك — 5 تصاميم',
    channel: 'instagram',
    status: 'scheduled',
    hook: 'التالت هدية، بس لازم تختار صح.',
    goal: 'عرض كل التصاميم المتاحة كهدية تالتة وتسهيل قرار العميل',
    format: 'Catalog carousel · 5 slides · 1:1',
    platforms: 'Instagram Feed + Facebook',
    caption:
      'كل التصاميم دي تقدر تختار منها هدية التالت 🎁 HOPE بالنبيتي أو الأبيض، STWD الأسود المغسول، RELAX الأحمر الطوبي، أو NO FABRIGATE البني. اختار قطعتين تشتريهم وقطعة تالتة من هنا هدية. احفظ البوست علشان ترجعله وقت الاختيار. التوصيل داخل القاهرة والجيزة. #KINBO #Buy2Get1 #ملابس_رجالي #StreetwearEgypt',
    cta: `Save + WhatsApp بالتلات اختيارات. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes:
      'كل سلايد تصميم واحد بس، من غير عناصر تانية في الكادر. رتب من الأغمق للأفتح (نبيتي → أبيض → أسود → أحمر طوبي → بني) عشان التنوع يبان بوضوح من أول سحبة.',
    slides: [
      { src: '/kinbo/tee-hope-burgundy.jpg', alt: 'تيشيرت HOPE نبيتي بطبعة tone-on-tone' },
      { src: '/kinbo/tee-hope-white.jpg', alt: 'تيشيرت HOPE أبيض بطبعة سوداء' },
      { src: '/kinbo/tee-stwd-washed-black.jpg', alt: 'تيشيرت STWD أسود مغسول' },
      { src: '/kinbo/tee-relax-rust.jpg', alt: 'تيشيرت RELAX أحمر طوبي بطبعة رأسية' },
      { src: '/kinbo/tee-no-fabrigate-brown.jpg', alt: 'تيشيرت بني بطبعة NO FABRIGATE صغيرة' },
    ],
  },
  {
    id: 'kinbo-b2g1-math',
    day: '2026-09-03',
    time: '20:30',
    title: '٢ + ١ = ٣ لوكات كاملة',
    channel: 'tiktok',
    status: 'scheduled',
    hook: 'المعادلة اللي هتوفرلك فلوس: ٢ + ١ = ٣.',
    goal: 'تبسيط قيمة عرض Buy 2 Get 1 بمعادلة بصرية سهلة الفهم',
    format: 'Value carousel · 3 slides · 1:1',
    platforms: 'Instagram Feed + Facebook + TikTok',
    caption:
      'العملية بسيطة: تدفع في ٢ تيشيرت، وتاخد ٣ 🧮 كل تيشيرت بيتلبس لوحده أو مع أي حاجة تانية عندك. دي ٣ تصاميم من ضمن اللي هتيجي معاهم في العرض. التوصيل داخل القاهرة والجيزة. #KINBO #Buy2Get1 #ستايل_رجالي #CairoStreetwear',
    cta: `WhatsApp بالتلات اختيارات + المقاس. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes:
      'الفكرة كلها في معادلة "٢+١=٣" — لو فيه أداة تصميم متاحة حطها كنص كبير فوق Slide 1، ولو مفيش سيبها في الكابشن بس. Slides 2–3 كلوز أب على قطعتين من الكاروسيل الأول عشان يفضل خيط بصري واحد بين البوستات.',
    slides: [
      { src: '/kinbo/rack-trio-relax-fade-stwd.jpg', alt: 'كلوز أب على تلات تيشيرتات: RELAX أحمر طوبي، رمادي مغسول، STWD أسود' },
      { src: '/kinbo/tee-relax-rust.jpg', alt: 'تيشيرت RELAX أحمر طوبي بطبعة رأسية' },
      { src: '/kinbo/tee-stwd-washed-black.jpg', alt: 'تيشيرت STWD أسود مغسول' },
    ],
  },
  {
    id: 'kinbo-b2g1-urgency',
    day: '2026-09-04',
    time: '19:00',
    title: 'العرض بيقرب يخلص',
    channel: 'instagram',
    status: 'scheduled',
    hook: 'لسه مقررتش التلاتة بتوعك؟ العرض مش هيفضل.',
    goal: 'خلق إلحاح لإغلاق الطلبات قبل ما العرض يقفل',
    format: 'Reminder carousel · 2 slides · 1:1',
    platforms: 'Instagram Feed + Facebook',
    caption:
      'تذكير سريع ⏰ عرض اشتري ٢ تيشيرت وخد التالت هدية لسه شغال، بس مش هيفضل لفترة طويلة. الجودة والطبعة زي ما شايف في الصور — قطن تقيل وتفاصيل واضحة. متسيبش قرارك لآخر لحظة. التوصيل داخل القاهرة والجيزة. #KINBO #Buy2Get1 #عرض_محدود #ستريت_وير_مصر',
    cta: `WhatsApp دلوقتي بالتلات تيشيرتات + المقاس. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes:
      'صور قريبة تركز على جودة القماش والطبعة عشان تبرر ليه العرض يستاهل قرار سريع. لو فيه تاريخ نهاية فعلي للعرض، استبدل "لفترة محدودة" بالتاريخ الصريح.',
    slides: [
      { src: '/kinbo/tee-mimic-maroon-wide.jpg', alt: 'تيشيرت MIMIC نبيتي لقطة واسعة على الاستاند' },
      { src: '/kinbo/tee-varsity-sand-closeup.jpg', alt: 'كلوز أب على طبعة VARSITY وقماش التيشيرت' },
    ],
  },
  {
    id: 'kinbo-b2g1-bonus-design',
    day: '2026-09-05',
    time: '20:00',
    title: 'تصميم جديد ضاف للعرض',
    channel: 'instagram',
    status: 'scheduled',
    hook: 'في تصميم لسه ما شفتوش — وهو كمان داخل في العرض.',
    goal: 'تجديد الاهتمام بالعرض قبل ما يقفل بإضافة اختيار جديد للكاتالوج',
    format: 'Reveal carousel · 2 slides · 1:1',
    platforms: 'Instagram Feed + Facebook + TikTok',
    caption:
      'مفاجأة صغيرة قبل ما العرض يخلص 👀 تصميم BLACK الجديد ضاف لقائمة الاختيارات، فتقدر تاخده كتيشيرت أساسي أو كهدية التالتة. العرض لسه ساري: اشتري ٢ تيشيرت وخد التالت من اختيارك هدية. التوصيل داخل القاهرة والجيزة. #KINBO #Buy2Get1 #تصميم_جديد #ملابس_رجالي',
    cta: `WhatsApp بالتلات اختيارات (شامل BLACK لو حابب) + المقاس. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes:
      'التصميم ده متصور في استوديو مختلف (خلفية نيون حمراء) — وضح في الكابشن إنه من ضمن كتالوج التيشيرتات العادي مش لوك منفصل، عشان العميل ميتلخبطش. آخر بوست في العرض، فخليه يذكّر بالعرض كامل مش بس بالتصميم الجديد.',
    slides: [
      { src: '/kinbo/tee-black-rust-neon.jpg', alt: 'تيشيرت BLACK أحمر طوبي على استاند في استوديو نيون' },
      { src: '/kinbo/tee-mimic-maroon.jpg', alt: 'تيشيرت MIMIC نبيتي بطبعة كريمي' },
    ],
  },
];
