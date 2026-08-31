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

/**
 * The original one-image inventory is kept as a source of already-written product records.
 * The public calendar below intentionally composes those assets into fewer, richer carousels
 * for organic reach instead of publishing 22 catalogue-style posts back-to-back.
 */
const LEGACY_CONTENT_PLAN: PlanPost[] = [
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
  {
    id: 'kinbo-hero-wasted-black',
    day: '2026-09-06',
    time: '20:00',
    title: 'WASTED — الأسود اللي بيقول كل حاجة',
    channel: 'instagram',
    status: 'scheduled',
    hook: 'أسود، جرافيك قوي، وحضور من أول نظرة.',
    goal: 'تقديم تيشيرت WASTED الأسود كبداية لسلسلة عرض القطع الجديدة',
    format: 'Product hero · 1 slide · 1:1',
    platforms: 'Instagram Feed + Facebook',
    caption:
      'لو بتحب التيشيرت الأسود بس مش العادي، WASTED معمول علشان يبان. جرافيك واضح، قصة ستريت وير، ولون سهل يدخل في أي لوك. ابعتلنا مقاسك على واتساب واعرف المتاح. #KINBO #WASTED #StreetwearEgypt #ملابس_رجالي',
    cta: `WhatsApp بالمقاس واحجز WASTED. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes:
      'بوست منتج منفرد. استخدم الصورة كما هي من غير كتابة فوق الجرافيك؛ اسم القطعة واضح على التيشيرت والنيون يثبت هوية المتجر.',
    slides: [
      { src: '/kinbo/tee-wasted-black.png', alt: 'تيشيرت WASTED أسود معروض على شماعة داخل متجر KINBO' },
    ],
  },
  {
    id: 'kinbo-hero-no-fabricate-off-white',
    day: '2026-09-07',
    time: '19:30',
    title: 'NO FABRICATE — أوف وايت',
    channel: 'instagram',
    status: 'scheduled',
    hook: 'درجة هادية بتسيب التفاصيل هي اللي تتكلم.',
    goal: 'إبراز لون الأوف وايت كاختيار صيفي سهل التنسيق',
    format: 'Product hero · 1 slide · 1:1',
    platforms: 'Instagram Feed + Facebook',
    caption:
      'NO FABRICATE بالأوف وايت: لون هادي، طبعة نظيفة، وقطعة تقدر تلبسها من الصبح لحد آخر اليوم. نسّقه مع جينز أو كارغو وخلي اللوك بسيط ومظبوط. ابعتلنا مقاسك على واتساب. #KINBO #NoFabricate #StreetwearEgypt #ستايل_رجالي',
    cta: `WhatsApp بالمقاس واسأل عن NO FABRICATE أوف وايت. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes: 'بوست منتج منفرد يركز على درجة الأوف وايت ووضوح الطباعة الأمامية.',
    slides: [
      { src: '/kinbo/tee-no-fabricate-off-white.png', alt: 'تيشيرت NO FABRICATE أوف وايت على شماعة سوداء داخل متجر KINBO' },
    ],
  },
  {
    id: 'kinbo-hero-black-outline',
    day: '2026-09-08',
    time: '20:30',
    title: 'BLACK OUTLINE — أسود على أسود',
    channel: 'tiktok',
    status: 'scheduled',
    hook: 'التفصيلة اللي ما تبانش لكل الناس — وده سرها.',
    goal: 'عرض التصميم الأسود التونال لعشاق القطع الهادئة',
    format: 'Product reveal · 1 slide · 1:1',
    platforms: 'Instagram Feed + Facebook + TikTok',
    caption:
      'BLACK OUTLINE معمول للي يحب التفاصيل الهادية. أسود على أسود، جرافيك تونال، وشكل يتغير مع الإضاءة. قطعة أساسية بس مش عادية. ابعتلنا مقاسك على واتساب. #KINBO #BlackOnBlack #StreetwearEgypt #تيشيرتات',
    cta: `WhatsApp بالمقاس واحجز BLACK OUTLINE. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes: 'خلي الصورة هي البطل؛ إضاءة المتجر تُظهر الطباعة التونال من غير أي معالجة إضافية.',
    slides: [
      { src: '/kinbo/tee-black-outline.png', alt: 'تيشيرت BLACK OUTLINE أسود بطباعة سوداء تونال داخل متجر KINBO' },
    ],
  },
  {
    id: 'kinbo-hero-no-fabricate-olive',
    day: '2026-09-09',
    time: '19:00',
    title: 'NO FABRICATE — زيتي',
    channel: 'instagram',
    status: 'scheduled',
    hook: 'الزيتي اللي يكمل أي لوك ستريت.',
    goal: 'تقديم اللون الزيتي من التصميم نفسه كبديل عملي للألوان المحايدة',
    format: 'Product hero · 1 slide · 1:1',
    platforms: 'Instagram Feed + Facebook',
    caption:
      'نفس روح NO FABRICATE بلون زيتي أعمق. سهل مع الأسود، البيج، والدنيم، وبيبان من غير ما يكون صاخب. اختار مقاسك وابعتلنا على واتساب. #KINBO #NoFabricate #OliveTee #StreetwearEgypt',
    cta: `WhatsApp بالمقاس واسأل عن اللون الزيتي. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes: 'بوست منتج منفرد؛ حافظ على اللون الزيتي كما هو لأنه نقطة الاختلاف الأساسية.',
    slides: [
      { src: '/kinbo/tee-no-fabricate-olive.png', alt: 'تيشيرت NO FABRICATE زيتي معروض في متجر KINBO' },
    ],
  },
  {
    id: 'kinbo-hero-wormhole-teal',
    day: '2026-09-10',
    time: '20:00',
    title: 'WORMHOLE — بترولي',
    channel: 'instagram',
    status: 'scheduled',
    hook: 'لون مختلف وجرافيك يسحب العين لجواه.',
    goal: 'إظهار التنوع اللوني والجرافيك الجريء في مجموعة التيشيرتات',
    format: 'Graphic tee hero · 1 slide · 1:1',
    platforms: 'Instagram Feed + Facebook',
    caption:
      'WORMHOLE باللون البترولي معمول علشان يبقى محور اللوك. طبعة جرافيك واضحة ولون يخرجك من الدايرة المعتادة من غير ما يصعب تنسيقه. ابعتلنا مقاسك على واتساب. #KINBO #Wormhole #GraphicTee #StreetwearEgypt',
    cta: `WhatsApp بالمقاس واحجز WORMHOLE. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes: 'لا تضف نصًا فوق الصورة؛ الجرافيك نفسه هو نقطة التوقف البصرية.',
    slides: [
      { src: '/kinbo/tee-wormhole-teal.png', alt: 'تيشيرت WORMHOLE بترولي بطباعة جرافيك داخل متجر KINBO' },
    ],
  },
  {
    id: 'kinbo-hero-power-teal',
    day: '2026-09-11',
    time: '20:30',
    title: 'POWER — بترولي',
    channel: 'tiktok',
    status: 'scheduled',
    hook: 'قطعة واحدة كفاية ترفع طاقة اللوك.',
    goal: 'تعريف تصميم POWER وربطه بلوك يومي جريء',
    format: 'Product spotlight · 1 slide · 1:1',
    platforms: 'Instagram Feed + Facebook + TikTok',
    caption:
      'POWER مش مجرد اسم على تيشيرت. اللون البترولي والجرافيك الأمامي عاملين قطعة بتقف لوحدها حتى مع أبسط بنطلون وسنيكرز. المقاسات المتاحة على واتساب. #KINBO #POWER #GraphicTee #CairoStreetwear',
    cta: `WhatsApp بالمقاس واحجز POWER. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes: 'بوست منتج منفرد مع ترك مساحة للصورة الأصلية وإضاءة النيون بدون overlays.',
    slides: [
      { src: '/kinbo/tee-power-teal.png', alt: 'تيشيرت POWER بترولي معروض على شماعة داخل متجر KINBO' },
    ],
  },
  {
    id: 'kinbo-hero-black-outline-rust',
    day: '2026-09-12',
    time: '19:30',
    title: 'BLACK OUTLINE — أحمر طوبي',
    channel: 'instagram',
    status: 'scheduled',
    hook: 'نفس الجرافيك الهادي، بلون أدفى.',
    goal: 'عرض اللون الأحمر الطوبي من BLACK OUTLINE وتوسيع اختيارات التصميم',
    format: 'Colorway hero · 1 slide · 1:1',
    platforms: 'Instagram Feed + Facebook',
    caption:
      'BLACK OUTLINE بالأحمر الطوبي: لون دافي، طبعة داكنة، وتوازن يخلي القطعة مختلفة وسهلة اللبس في نفس الوقت. ابعتلنا مقاسك واعرف المتاح. #KINBO #BlackOutline #RustTee #StreetwearEgypt',
    cta: `WhatsApp بالمقاس واسأل عن الأحمر الطوبي. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes: 'ركز على تباين الطباعة السوداء مع اللون الأحمر الطوبي الحقيقي للقماش.',
    slides: [
      { src: '/kinbo/tee-black-outline-rust.png', alt: 'تيشيرت BLACK OUTLINE أحمر طوبي بطباعة سوداء داخل متجر KINBO' },
    ],
  },
  {
    id: 'kinbo-hero-agency-burgundy',
    day: '2026-09-13',
    time: '20:00',
    title: 'AGENCY — نبيتي',
    channel: 'instagram',
    status: 'scheduled',
    hook: 'النبيتي لما يبقى له حضور من غير مجهود.',
    goal: 'تقديم تيشيرت AGENCY النبيتي كلون أساسي مميز',
    format: 'Product hero · 1 slide · 1:1',
    platforms: 'Instagram Feed + Facebook',
    caption:
      'AGENCY بالنبيتي قطعة تدخل دولابك وتشتغل مع كل حاجة تقريبًا. لون غني، جرافيك واضح، وقصة ستريت سهلة. ابعتلنا على واتساب بالمقاس. #KINBO #AGENCY #BurgundyTee #ملابس_رجالي',
    cta: `WhatsApp بالمقاس واحجز AGENCY. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes: 'بوست منتج منفرد يوضح اللون النبيتي ومكان الجرافيك بدقة.',
    slides: [
      { src: '/kinbo/tee-agency-burgundy.png', alt: 'تيشيرت AGENCY نبيتي معروض داخل متجر KINBO' },
    ],
  },
  {
    id: 'kinbo-hero-black-outline-mauve',
    day: '2026-09-14',
    time: '19:00',
    title: 'BLACK OUTLINE — موف ترابي',
    channel: 'instagram',
    status: 'scheduled',
    hook: 'درجة مش منتشرة، وده بالضبط سبب اختيارها.',
    goal: 'عرض اللون الموف الترابي كاختيار مميز من تصميم BLACK OUTLINE',
    format: 'Colorway hero · 1 slide · 1:1',
    platforms: 'Instagram Feed + Facebook',
    caption:
      'BLACK OUTLINE بالموف الترابي للي عايز لون مختلف من غير مبالغة. طبعة داكنة ونغمة لون هادية تشتغل مع الأسود والدنيم بسهولة. المقاسات على واتساب. #KINBO #BlackOutline #MauveTee #StreetwearEgypt',
    cta: `WhatsApp بالمقاس واسأل عن الموف الترابي. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes: 'حافظ على دقة درجة اللون؛ لا تستخدم فلاتر تغير الموف الترابي.',
    slides: [
      { src: '/kinbo/tee-black-outline-mauve.png', alt: 'تيشيرت BLACK OUTLINE موف ترابي بطباعة سوداء داخل متجر KINBO' },
    ],
  },
  {
    id: 'kinbo-hero-denim-short-sleeve',
    day: '2026-09-15',
    time: '20:00',
    title: 'قميص دنيم مغسول — كم قصير',
    channel: 'instagram',
    status: 'scheduled',
    hook: 'طبقة دنيم خفيفة تغيّر اللوك كله.',
    goal: 'نقل التركيز من التيشيرتات إلى القمصان وتقديم قميص الدنيم',
    format: 'Shirt hero · 1 slide · 1:1',
    platforms: 'Instagram Feed + Facebook',
    caption:
      'قميص الدنيم المغسول بكم قصير ينفع يتلبس مقفول أو مفتوح فوق تيشيرت سادة. ملمس واضح ولون غسيل يدي كل قطعة شخصيتها. ابعتلنا مقاسك على واتساب. #KINBO #DenimShirt #MenswearEgypt #ستايل_رجالي',
    cta: `WhatsApp بالمقاس واحجز قميص الدنيم. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes: 'بداية سلسلة القمصان. الصورة تُظهر ملمس الدنيم والغسيل، فلا تضف فلترًا لونيًا.',
    slides: [
      { src: '/kinbo/shirt-denim-washed-short-sleeve.png', alt: 'قميص دنيم مغسول بكم قصير معروض داخل متجر KINBO' },
    ],
  },
  {
    id: 'kinbo-hero-pinstripe-short-sleeve',
    day: '2026-09-16',
    time: '19:30',
    title: 'قميص Pinstripe — أبيض وأسود',
    channel: 'instagram',
    status: 'scheduled',
    hook: 'خطوط نظيفة للوك أهدى وأرتب.',
    goal: 'تقديم القميص المخطط كقطعة smart-casual سهلة',
    format: 'Shirt hero · 1 slide · 1:1',
    platforms: 'Instagram Feed + Facebook',
    caption:
      'قميص Pinstripe الأبيض والأسود يديك شكل مرتب من غير ما يخرج من روح الستريت وير. كم قصير وخطوط رفيعة سهلة مع بنطلون أسود أو دنيم. ابعتلنا مقاسك. #KINBO #Pinstripe #MenswearEgypt #قميص_رجالي',
    cta: `WhatsApp بالمقاس واسأل عن قميص Pinstripe. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes: 'حافظ على استقامة الخطوط ووضوحها عند أي قص أو إعادة تصدير.',
    slides: [
      { src: '/kinbo/shirt-pinstripe-white-black-short-sleeve.png', alt: 'قميص أبيض بخطوط سوداء رفيعة وكم قصير داخل متجر KINBO' },
    ],
  },
  {
    id: 'kinbo-hero-striped-green-long-sleeve',
    day: '2026-09-17',
    time: '20:30',
    title: 'قميص مخطط أخضر وأبيض',
    channel: 'tiktok',
    status: 'scheduled',
    hook: 'الخطوط الكلاسيك بروح KINBO.',
    goal: 'عرض قميص طويل الأكمام بلون منعش وتنسيق مرن',
    format: 'Shirt spotlight · 1 slide · 1:1',
    platforms: 'Instagram Feed + Facebook + TikTok',
    caption:
      'الأخضر مع الأبيض تركيبة نظيفة طول الوقت. القميص المخطط بكم طويل ينفع للوك مرتب أو مفتوح فوق تيشيرت حسب يومك. المقاسات المتاحة على واتساب. #KINBO #StripedShirt #MenswearEgypt #CairoStyle',
    cta: `WhatsApp بالمقاس واحجز القميص المخطط. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes: 'بوست منتج منفرد يركز على نمط الخطوط والياقة والأكمام الطويلة.',
    slides: [
      { src: '/kinbo/shirt-striped-green-white-long-sleeve.png', alt: 'قميص أخضر وأبيض مخطط بكم طويل داخل متجر KINBO' },
    ],
  },
  {
    id: 'kinbo-hero-black-short-sleeve-shirt',
    day: '2026-09-18',
    time: '19:00',
    title: 'القميص الأسود — كم قصير',
    channel: 'instagram',
    status: 'scheduled',
    hook: 'أبسط قطعة، وأكتر قطعة هتلبسها.',
    goal: 'تقديم القميص الأسود السادة كقطعة أساسية متعددة الاستخدام',
    format: 'Essential hero · 1 slide · 1:1',
    platforms: 'Instagram Feed + Facebook',
    caption:
      'القميص الأسود بكم قصير هو القطعة اللي تنقذك كل مرة تحتار تلبس إيه. سادة، نظيف، وسهل مع أي بنطلون عندك. ابعتلنا مقاسك واعرف المتاح. #KINBO #BlackShirt #MenswearEssentials #ملابس_رجالي',
    cta: `WhatsApp بالمقاس واحجز القميص الأسود. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes: 'ركز على القصة والياقة وملمس القماش؛ لا حاجة لعناصر تصميم إضافية.',
    slides: [
      { src: '/kinbo/shirt-black-short-sleeve.png', alt: 'قميص أسود سادة بكم قصير على شماعة داخل متجر KINBO' },
    ],
  },
  {
    id: 'kinbo-hero-burnt-orange-shirt',
    day: '2026-09-19',
    time: '20:00',
    title: 'قميص برتقالي محروق — كم قصير',
    channel: 'instagram',
    status: 'scheduled',
    hook: 'لون دافي يبان من غير ما يزعق.',
    goal: 'إبراز اللون البرتقالي المحروق كاختيار موسمي مميز',
    format: 'Color hero · 1 slide · 1:1',
    platforms: 'Instagram Feed + Facebook',
    caption:
      'البرتقالي المحروق لون مختلف بس سهل. القميص بكم قصير يتنسق مع الأسود، البيج أو الدنيم ويدي اللوك دفء واضح. ابعتلنا مقاسك على واتساب. #KINBO #BurntOrange #MenswearEgypt #ستايل_رجالي',
    cta: `WhatsApp بالمقاس واسأل عن البرتقالي المحروق. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes: 'دقة اللون أساسية في هذا البوست؛ استخدم الصورة الأصلية من دون color grading إضافي.',
    slides: [
      { src: '/kinbo/shirt-burnt-orange-short-sleeve.png', alt: 'قميص برتقالي محروق بكم قصير داخل متجر KINBO' },
    ],
  },
  {
    id: 'kinbo-hero-forest-green-shirt',
    day: '2026-09-20',
    time: '20:30',
    title: 'قميص أخضر غامق — كم قصير',
    channel: 'instagram',
    status: 'scheduled',
    hook: 'الأخضر الغامق هو الـ neutral الجديد.',
    goal: 'تقديم القميص الأخضر الغامق كبديل للأسود',
    format: 'Shirt hero · 1 slide · 1:1',
    platforms: 'Instagram Feed + Facebook',
    caption:
      'لو عايز تغير من الأسود من غير ما تدخل في لون صعب، الأخضر الغامق هو الاختيار. قميص بكم قصير وشكل نظيف يشتغل في أكتر من مناسبة. المقاسات على واتساب. #KINBO #ForestGreen #MenswearEgypt #قميص_رجالي',
    cta: `WhatsApp بالمقاس واحجز القميص الأخضر. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes: 'بوست منتج منفرد يوضح عمق اللون وتفاصيل القميص الأمامية.',
    slides: [
      { src: '/kinbo/shirt-forest-green-short-sleeve.png', alt: 'قميص أخضر غامق بكم قصير معروض داخل متجر KINBO' },
    ],
  },
  {
    id: 'kinbo-hero-black-long-sleeve-shirt',
    day: '2026-09-21',
    time: '19:30',
    title: 'القميص الأسود — كم طويل',
    channel: 'instagram',
    status: 'scheduled',
    hook: 'قطعة أساسية من الشغل للخروجة.',
    goal: 'عرض القميص الأسود طويل الأكمام كخيار أكثر رسمية ومرونة',
    format: 'Essential hero · 1 slide · 1:1',
    platforms: 'Instagram Feed + Facebook',
    caption:
      'قميص أسود بكم طويل، قصة نظيفة، واستخدامات من غير عدد. البسه مقفول للوك أرتب أو افتحه فوق تيشيرت للوك أهدى. ابعتلنا مقاسك. #KINBO #BlackShirt #MenswearEssentials #CairoStyle',
    cta: `WhatsApp بالمقاس واحجز القميص الأسود الطويل. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes: 'أظهر طول الأكمام والقصة كاملة؛ الصورة المربعة مصممة لذلك.',
    slides: [
      { src: '/kinbo/shirt-black-long-sleeve.png', alt: 'قميص أسود سادة بكم طويل على شماعة داخل متجر KINBO' },
    ],
  },
  {
    id: 'kinbo-hero-brown-textured-shirt',
    day: '2026-09-22',
    time: '20:00',
    title: 'قميص بني بملمس واضح',
    channel: 'instagram',
    status: 'scheduled',
    hook: 'هنا الخامة هي التصميم.',
    goal: 'إبراز ملمس القماش كقيمة أساسية في القميص البني',
    format: 'Texture hero · 1 slide · 1:1',
    platforms: 'Instagram Feed + Facebook',
    caption:
      'القميص البني ده قوته في الخامة. ملمس واضح، لون دافي، وكم طويل يخليه قطعة سهلة للّبس بطبقات. قرب في الصورة وشوف التفاصيل، وبعدها ابعتلنا مقاسك. #KINBO #TexturedShirt #BrownShirt #MenswearEgypt',
    cta: `WhatsApp بالمقاس واسأل عن القميص البني. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes: 'تفاصيل النسيج هي البطل؛ تجنب ضغط الصورة أو التعديلات التي تمسح ملمس القماش.',
    slides: [
      { src: '/kinbo/shirt-brown-textured-long-sleeve.png', alt: 'قميص بني محبب الملمس بكم طويل داخل متجر KINBO' },
    ],
  },
  {
    id: 'kinbo-hero-light-blue-shirt',
    day: '2026-09-23',
    time: '19:00',
    title: 'قميص أزرق فاتح — كم طويل',
    channel: 'instagram',
    status: 'scheduled',
    hook: 'نضيف، هادي، ويشتغل طول الأسبوع.',
    goal: 'تقديم القميص الأزرق الفاتح كقطعة يومية مرتبة',
    format: 'Shirt hero · 1 slide · 1:1',
    platforms: 'Instagram Feed + Facebook',
    caption:
      'الأزرق الفاتح من القطع اللي شكلها مرتب من غير مجهود. القميص بكم طويل ينفع للشغل، للخروجة، أو مفتوح فوق تيشيرت أبيض. المقاسات المتاحة على واتساب. #KINBO #LightBlueShirt #MenswearEgypt #ستايل_رجالي',
    cta: `WhatsApp بالمقاس واحجز القميص الأزرق. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes: 'حافظ على درجة الأزرق الفاتح المحايدة وتفاصيل الياقة والأزرار.',
    slides: [
      { src: '/kinbo/shirt-light-blue-long-sleeve.png', alt: 'قميص أزرق فاتح بكم طويل معروض داخل متجر KINBO' },
    ],
  },
  {
    id: 'kinbo-hero-gray-shirt',
    day: '2026-09-24',
    time: '20:30',
    title: 'قميص رمادي — كم طويل',
    channel: 'tiktok',
    status: 'scheduled',
    hook: 'الرمادي اللي يربط كل ألوان دولابك ببعض.',
    goal: 'إظهار القميص الرمادي كقطعة محايدة متعددة التنسيقات',
    format: 'Essential spotlight · 1 slide · 1:1',
    platforms: 'Instagram Feed + Facebook + TikTok',
    caption:
      'القميص الرمادي قطعة أساسية بجد: مع الأسود، الدنيم، البيج أو أي لون أقوى. كم طويل وقصة نظيفة تخليه مناسب لأكتر من ستايل. ابعتلنا مقاسك. #KINBO #GrayShirt #MenswearEssentials #StreetStyle',
    cta: `WhatsApp بالمقاس واحجز القميص الرمادي. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes: 'آخر بوست في سلسلة القمصان؛ استخدم الصورة كاملة لإظهار القصة والأكمام.',
    slides: [
      { src: '/kinbo/shirt-gray-long-sleeve.png', alt: 'قميص رمادي بكم طويل على شماعة داخل متجر KINBO' },
    ],
  },
  {
    id: 'kinbo-hero-miu-slate-joggers',
    day: '2026-09-25',
    time: '20:00',
    title: 'MIU Joggers — رمادي داكن',
    channel: 'instagram',
    status: 'scheduled',
    hook: 'راحة اليوم كله بشكل محسوب.',
    goal: 'بدء سلسلة البناطيل الرياضية بتصميم MIU الرمادي الداكن',
    format: 'Joggers hero · 1 slide · 1:1',
    platforms: 'Instagram Feed + Facebook',
    caption:
      'MIU Joggers بالرمادي الداكن معمول للراحة من غير ما تتنازل عن شكل اللوك. لون عملي وتفاصيل بسيطة تخليه سهل مع أي تيشيرت أو هودي. ابعتلنا مقاسك على واتساب. #KINBO #Joggers #MIU #StreetwearEgypt',
    cta: `WhatsApp بالمقاس واحجز MIU Joggers. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes: 'بداية سلسلة الجوجرز. اعرض البنطلون كاملًا ولا تقص تفاصيل الخصر أو الأساور.',
    slides: [
      { src: '/kinbo/joggers-miu-slate.png', alt: 'بنطلون MIU Joggers رمادي داكن معروض داخل متجر KINBO' },
    ],
  },
  {
    id: 'kinbo-hero-minimal-light-gray-joggers',
    day: '2026-09-26',
    time: '19:30',
    title: 'Minimal Joggers — رمادي فاتح',
    channel: 'instagram',
    status: 'scheduled',
    hook: 'أقل تفاصيل، أكتر تنسيقات.',
    goal: 'تقديم الجوجرز الرمادي الفاتح كقطعة يومية بسيطة',
    format: 'Joggers hero · 1 slide · 1:1',
    platforms: 'Instagram Feed + Facebook',
    caption:
      'Minimal Joggers بالرمادي الفاتح هو الأساس اللي تقدر تبني عليه أي لوك كاجوال. تفاصيل قليلة، لون محايد، وراحة تناسب يومك كله. المقاسات على واتساب. #KINBO #MinimalJoggers #StreetwearEgypt #ستايل_رجالي',
    cta: `WhatsApp بالمقاس واحجز Minimal Joggers. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes: 'حافظ على اللون الرمادي الفاتح ووضوح التفاصيل الصغيرة من دون زيادة contrast.',
    slides: [
      { src: '/kinbo/joggers-minimal-light-gray.png', alt: 'بنطلون Minimal Joggers رمادي فاتح داخل متجر KINBO' },
    ],
  },
  {
    id: 'kinbo-hero-limited-edition-black-joggers',
    day: '2026-09-27',
    time: '20:30',
    title: 'LIMITED EDITION Joggers — أسود',
    channel: 'tiktok',
    status: 'scheduled',
    hook: 'الأسود الأساسي، بتفصيلة مش أساسية.',
    goal: 'ختام سلسلة المنتجات بجوجرز أسود يحمل هوية LIMITED EDITION',
    format: 'Drop finale · 1 slide · 1:1',
    platforms: 'Instagram Feed + Facebook + TikTok',
    caption:
      'LIMITED EDITION Joggers بالأسود قطعة عملية لكن مش مجهولة. التفاصيل المطبوعة تديها شخصية، واللون يخليها أسهل اختيار كل يوم. ابعتلنا مقاسك قبل ما المتاح يخلص. #KINBO #LimitedEdition #BlackJoggers #StreetwearEgypt',
    cta: `WhatsApp بالمقاس واحجز LIMITED EDITION Joggers. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes: 'ختام سلسلة عرض القطع الجديدة. خلي الطباعة الأصلية واضحة من غير إضافة كتابة تنافسها.',
    slides: [
      { src: '/kinbo/joggers-limited-edition-black.png', alt: 'بنطلون LIMITED EDITION Joggers أسود معروض داخل متجر KINBO' },
    ],
  },
];

const ORGANIC_CAROUSEL_POSTS: PlanPost[] = [
  {
    id: 'kinbo-organic-graphic-tee-drop',
    day: '2026-09-06',
    time: '20:00',
    title: 'أي جرافيك شبهك؟',
    channel: 'instagram',
    status: 'scheduled',
    hook: 'مش كل تيشيرت جرافيك بيتلبس بنفس الطريقة.',
    goal: 'زيادة الحفظ والتعليقات عبر مساعدة المتابع يختار بين 4 شخصيات جرافيك مختلفة',
    format: 'Choice carousel · 4 slides · 1:1',
    platforms: 'Instagram Feed + Facebook',
    caption:
      'مش كل يوم له نفس المود.\n\nWASTED لو بتحب الحضور الهادي، WORMHOLE أو POWER لو عايز لون يوقف السكرول، وAGENCY لو النبيتي هو لونك.\n\nاكتب في الكومنت: 1 أو 2 أو 3 أو 4 — أي واحد شبهك أكتر؟ واحفظ الكاروسيل لما تيجي تختار مقاسك.\n\nللمقاس والمخزون: ابعتلنا كلمة “GRAPHIC” على واتساب. #KINBO #تيشيرتات_جرافيك #StreetwearEgypt #CairoStreetwear #ستايل_رجالي',
    cta: `Comment برقم اختيارك، واحفظ البوست، وبعدها WhatsApp بكلمة GRAPHIC للمقاس. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes:
      'Carousel من 4 صور: WASTED، WORMHOLE، POWER، AGENCY. الغلاف يكون WASTED. الكابشن يبيع فكرة اختيار الشخصية أولًا، ثم ينقل العميل لواتساب.',
    slides: [
      { src: '/kinbo/tee-wasted-black.png', alt: 'تيشيرت WASTED أسود داخل متجر KINBO' },
      { src: '/kinbo/tee-wormhole-teal.png', alt: 'تيشيرت WORMHOLE بترولي بطباعة جرافيك' },
      { src: '/kinbo/tee-power-teal.png', alt: 'تيشيرت POWER بترولي داخل متجر KINBO' },
      { src: '/kinbo/tee-agency-burgundy.png', alt: 'تيشيرت AGENCY نبيتي داخل متجر KINBO' },
    ],
  },
  {
    id: 'kinbo-organic-no-fabricate-colorways',
    day: '2026-09-09',
    time: '19:30',
    title: 'نفس التصميم… أنهي لون؟',
    channel: 'instagram',
    status: 'scheduled',
    hook: 'الأوف وايت ولا الزيتي؟ الاختيار ده بيغيّر اللوك كله.',
    goal: 'تحفيز التعليقات والحفظ حول اختيار اللون مع إبراز تنوع NO FABRICATE',
    format: 'Colorway carousel · 2 slides · 1:1',
    platforms: 'Instagram Feed + Facebook',
    caption:
      'نفس NO FABRICATE، إحساسين مختلفين.\n\nالأوف وايت: هادي ويمشي مع الدنيم.\nالزيتي: أغمق ويدخل بسهولة مع الأسود والبيج.\n\nلو هتاخد واحد بس، تختار A ولا B؟ ابعت البوست لصاحبك اللي دايمًا محتار في الألوان، واحفظه قبل ما تسأل عن المقاس.\n\nللمتاح والمقاسات: WhatsApp بكلمة “NF”. #KINBO #NoFabricate #اختيارك_يهم #StreetwearEgypt #ملابس_رجالي',
    cta: `Comment A أو B، وWhatsApp بكلمة NF للمقاس والمخزون. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes:
      'Slide 1 أوف وايت، Slide 2 زيتي. استخدم الكابشن كاختبار لون بسيط بدل وصف خامة عام.',
    slides: [
      { src: '/kinbo/tee-no-fabricate-off-white.png', alt: 'تيشيرت NO FABRICATE أوف وايت داخل متجر KINBO' },
      { src: '/kinbo/tee-no-fabricate-olive.png', alt: 'تيشيرت NO FABRICATE زيتي داخل متجر KINBO' },
    ],
  },
  {
    id: 'kinbo-organic-outline-colorways',
    day: '2026-09-12',
    time: '20:30',
    title: 'BLACK OUTLINE بثلاث شخصيات',
    channel: 'tiktok',
    status: 'scheduled',
    hook: 'نفس الجرافيك التونال، بس أنهي لون هياخد مكانه في دولابك؟',
    goal: 'خلق نقاش ألوان قابل للمشاركة وتحويل الاهتمام إلى استفسارات مقاس',
    format: 'Colorway carousel · 3 slides · 1:1',
    platforms: 'Instagram Feed + Facebook + TikTok',
    caption:
      'BLACK OUTLINE للناس اللي بتحب التفاصيل اللي تتشاف لما تقرّب.\n\nأسود على أسود؟ أحمر طوبي؟ موف ترابي؟\n\nاكتب لونك في الكومنت، وبعدها اعمل share لحد ذوقه هادي بس مش عادي. لو عايز تشوفه على مقاسك، ابعت “OUTLINE” على واتساب. #KINBO #BlackOutline #ToneOnTone #CairoStreetwear #تيشيرتات',
    cta: `Comment بلونك وWhatsApp بكلمة OUTLINE للمقاسات. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes:
      'Carousel من الأسود، الأحمر الطوبي، والموف الترابي. الغلاف الأسود. اترك المساحة الداكنة والطبعة التونال واضحين بدون نص فوق الصور.',
    slides: [
      { src: '/kinbo/tee-black-outline.png', alt: 'تيشيرت BLACK OUTLINE أسود بطباعة تونال' },
      { src: '/kinbo/tee-black-outline-rust.png', alt: 'تيشيرت BLACK OUTLINE أحمر طوبي بطباعة سوداء' },
      { src: '/kinbo/tee-black-outline-mauve.png', alt: 'تيشيرت BLACK OUTLINE موف ترابي بطباعة سوداء' },
    ],
  },
  {
    id: 'kinbo-organic-short-sleeve-shirts',
    day: '2026-09-15',
    time: '19:00',
    title: '5 قمصان تغيّر لوك الصيف',
    channel: 'instagram',
    status: 'scheduled',
    hook: 'قميص واحد مفتوح فوق تيشيرت = لوك جديد تمامًا.',
    goal: 'تقديم أفكار تنسيق عملية تزيد الحفظ والمشاركة بدل عرض القميص كمنتج منفرد',
    format: 'Styling carousel · 5 slides · 1:1',
    platforms: 'Instagram Feed + Facebook',
    caption:
      'لو التيشيرت لوحده بقى متوقع، جرّب طبقة قميص.\n\nدنيم مغسول للّوك اليومي، Pinstripe للّوك المرتب، أسود لو عايز حاجة مضمونة، وبرتقالي محروق أو أخضر غامق لو عايز اللون يعمل الشغل.\n\nاحفظ الكاروسيل كـ cheat sheet للتنسيق، واكتب في الكومنت: بتلبس القميص مفتوح ولا مقفول؟\n\nللمقاسات والأسعار: ابعت “SHIRTS” على واتساب. #KINBO #قمصان_رجالي #MenswearEgypt #CairoStyle #StreetwearEgypt',
    cta: `Save للّوكات وComment مفتوح أو مقفول، ثم WhatsApp بكلمة SHIRTS. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes:
      'رتب السلايدات: دنيم، Pinstripe، أسود، برتقالي محروق، أخضر غامق. الغلاف الدنيم لأنه الأكثر قابلية للحفظ والتنسيق.',
    slides: [
      { src: '/kinbo/shirt-denim-washed-short-sleeve.png', alt: 'قميص دنيم مغسول بكم قصير' },
      { src: '/kinbo/shirt-pinstripe-white-black-short-sleeve.png', alt: 'قميص أبيض بخطوط سوداء رفيعة' },
      { src: '/kinbo/shirt-black-short-sleeve.png', alt: 'قميص أسود سادة بكم قصير' },
      { src: '/kinbo/shirt-burnt-orange-short-sleeve.png', alt: 'قميص برتقالي محروق بكم قصير' },
      { src: '/kinbo/shirt-forest-green-short-sleeve.png', alt: 'قميص أخضر غامق بكم قصير' },
    ],
  },
  {
    id: 'kinbo-organic-long-sleeve-shirts',
    day: '2026-09-18',
    time: '20:00',
    title: 'اختار طبقتك: 5 قمصان كم طويل',
    channel: 'instagram',
    status: 'scheduled',
    hook: 'من لون هادي لملمس واضح — أي طبقة تكمل ستايلك؟',
    goal: 'زيادة الحفظ عبر دليل اختيار سريع للقمصان طويلة الأكمام',
    format: 'Style guide carousel · 5 slides · 1:1',
    platforms: 'Instagram Feed + Facebook',
    caption:
      'الطبقة الصح تخلّي نفس التيشيرت يبان كأنه لوك جديد.\n\nأخضر وأبيض لو بتحب الخطوط، أسود لو عايز الأساس، بني لو عينك على الخامة، وأزرق فاتح أو رمادي لو عايز لون يشتغل طول الأسبوع.\n\nاحفظ الدليل، وابعت الكاروسيل لحد بيجهز خروجة ومش عارف يلبس إيه. للمقاس: “LAYER” على واتساب. #KINBO #Layering #قمصان_رجالي #StreetwearEgypt #CairoStreetwear',
    cta: `Save وShare لحد محتار، ثم WhatsApp بكلمة LAYER للمقاس. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes:
      'السلايدات: أخضر/أبيض مخطط، أسود، بني بملمس، أزرق فاتح، رمادي. حافظ على ترتيب من الأكثر statement إلى الأكثر neutral.',
    slides: [
      { src: '/kinbo/shirt-striped-green-white-long-sleeve.png', alt: 'قميص أخضر وأبيض مخطط بكم طويل' },
      { src: '/kinbo/shirt-black-long-sleeve.png', alt: 'قميص أسود سادة بكم طويل' },
      { src: '/kinbo/shirt-brown-textured-long-sleeve.png', alt: 'قميص بني بملمس واضح بكم طويل' },
      { src: '/kinbo/shirt-light-blue-long-sleeve.png', alt: 'قميص أزرق فاتح بكم طويل' },
      { src: '/kinbo/shirt-gray-long-sleeve.png', alt: 'قميص رمادي بكم طويل' },
    ],
  },
  {
    id: 'kinbo-organic-joggers-guide',
    day: '2026-09-21',
    time: '20:30',
    title: '3 جوجرز — 3 طرق تلبسهم',
    channel: 'tiktok',
    status: 'scheduled',
    hook: 'راحة البيت؟ شكل الخروجة؟ الاتنين ممكن.',
    goal: 'إزالة تردد الشراء عبر ربط كل جوجرز باستخدام واضح وتشجيع الاستفسار عن المقاس',
    format: 'Use-case carousel · 3 slides · 1:1',
    platforms: 'Instagram Feed + Facebook + TikTok',
    caption:
      'مش لازم تختار بين الراحة والشكل.\n\nMIU الرمادي الداكن للّوك الرياضي، Minimal الرمادي الفاتح لو بتحب الهدوء، وLIMITED EDITION الأسود لو عايز تفصيلة ترفع الأساسيات.\n\nأنهي واحد هتلبسه أكتر؟ اكتب MIU أو MINIMAL أو LIMITED، واحفظ البوست قبل ما تطلب.\n\nابعت الكلمة نفسها على واتساب وهنبعتلك المقاسات المتاحة. #KINBO #Joggers #StreetwearEgypt #AthleisureEgypt #ستايل_رجالي',
    cta: `Comment MIU أو MINIMAL أو LIMITED، ثم WhatsApp بنفس الكلمة للمقاس. ${ASK_ABOUT_UNLISTED_STOCK}`,
    notes:
      'سلايد واحد لكل جوجرز. اربط كل لون/تفصيلة بحالة استخدام في الكابشن بدل ادعاء مواصفات غير مؤكدة.',
    slides: [
      { src: '/kinbo/joggers-miu-slate.png', alt: 'بنطلون MIU Joggers رمادي داكن' },
      { src: '/kinbo/joggers-minimal-light-gray.png', alt: 'بنطلون Minimal Joggers رمادي فاتح' },
      { src: '/kinbo/joggers-limited-edition-black.png', alt: 'بنطلون LIMITED EDITION Joggers أسود' },
    ],
  },
];

/**
 * The public calendar uses the original offer launch plus the organic carousel sequence.
 * The 22 generated assets remain available in the carousel slides, without duplicate
 * catalogue posts competing with one another in the same month.
 */
export const CONTENT_PLAN: PlanPost[] = [
  ...LEGACY_CONTENT_PLAN.slice(0, 5),
  ...ORGANIC_CAROUSEL_POSTS,
];
