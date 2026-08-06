/**
 * Seeds KINBO's 6–31 August 2026 Egyptian content calendar into the live dashboard.
 *
 * Safe to rerun: entries are keyed by their stable title. Existing rows are updated and
 * their current stored creative is preserved; missing entries upload a private cover image.
 *
 * Run:
 *   node --env-file=.env.local --import tsx/esm scripts/seed-kinbo-calendar.ts
 *   node --env-file=.env.local --import tsx/esm scripts/seed-kinbo-calendar.ts --force
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { getOwnerContext } from '../src/lib/dashboard';
import {
  createContentPost,
  createProject,
  decodeContentImagePaths,
  encodeContentImagePaths,
  getProjectBySlug,
  listContentPosts,
  updateContentPost,
  uploadContentImage,
} from '../src/lib/db/repository';

const IMAGE_ROOT = '/Users/mahmoudmac/Documents/marketing/kinbo-website/public/images';

type SeedPost = {
  day: string;
  time: string;
  title: string;
  phase: string;
  goal: string;
  hook: string;
  format: string;
  platforms: string;
  caption: string;
  cta: string;
  cover: string;
  assets: string[];
  notes: string;
  channel: 'instagram' | 'tiktok' | 'facebook';
};

const posts: SeedPost[] = [
  {
    day: '06', time: '20:30', title: 'ابدأ من هنا — KINBO وصل',
    phase: 'Launch foundation', goal: 'تعريف البراند وبناء أول بوست مثبت',
    hook: 'KINBO وصل — Streetwear معمول للوك اليومي في القاهرة والجيزة.',
    format: 'Pinned carousel · 5 slides',
    platforms: 'Instagram Feed + Facebook',
    caption: 'أهلاً بيك في KINBO. تيشيرتات oversized، sets وcargo تقدر تختارهم على ذوقك وتأكد المقاس واللون والتوفر مباشرة على واتساب. التوصيل داخل القاهرة والجيزة فقط. تابعنا لأننا هننزّل كل قطعة وتفاصيلها واحدة واحدة.',
    cta: 'Follow + Save. ثبّت البوست في أول خانة على البروفايل.',
    cover: 'products/bad-intentions-tee.jpg',
    assets: [
      'products/bad-intentions-tee.jpg',
      'products/corex-tee.png',
      'products/linen-set-colours.png',
      'generated/cargo-shorts-lost-paradise-4x5.png',
      'products/year-of-horse-tee.png',
    ],
    notes: 'Slide 1 عليه KINBO + “ابدأ من هنا”. Slides 2–4: الفئات. Slide 5: واتساب + القاهرة والجيزة. حافظ على corex بنسبة الصورة الأصلية داخل canvas 4:5.', channel: 'instagram',
  },
  {
    day: '07', time: '21:00', title: '3 تيشيرتات oversized في 8 ثواني',
    phase: 'Launch foundation', goal: 'أول Reel اكتشاف لغير المتابعين',
    hook: 'بتدور على تيشيرت oversized رجالي؟ شوف التلاتة دول.',
    format: 'Discovery Reel · 8 sec · 9:16',
    platforms: 'Instagram Reels + Facebook Reels + TikTok',
    caption: '3 اختيارات streetwear من KINBO: BAD، COREX وNEW CAST. لو بتدور على تيشيرت oversized في القاهرة أو الجيزة، ابعتلنا اسم التصميم ومقاسك على واتساب علشان نأكد المتاح.',
    cta: 'Follow للموديلات الجاية + WhatsApp للتوفر.',
    cover: 'products/bad-intentions-tee.jpg',
    assets: ['products/bad-intentions-tee.jpg', 'products/corex-tee.png', 'products/newcast-tee.png'],
    notes: '0–1s hook كبير. كل تصميم 2 ثانية مع الاسم على الشاشة. استخدم حركة crop/zoom مش slideshow ساكن. اختار audio native وقت النشر وأضف Cairo geotag.', channel: 'tiktok',
  },
  {
    day: '08', time: '20:00', title: 'دليل مجموعة KINBO',
    phase: 'Launch foundation', goal: 'إظهار تنوع الكتالوج وبناء ثاني بوست مثبت',
    hook: 'مش تيشيرتات بس — شوف مجموعة KINBO كاملة.',
    format: 'Pinned carousel · 6 slides',
    platforms: 'Instagram Feed + Facebook',
    caption: 'ابدأ من الكاتيجوري اللي يناسبك: graphic tees، summer sets، cargo shorts، cargo trousers أو lightweight trousers. احفظ الدليل وابعتلنا Screenshot للقطعة اللي عجبتك مع المقاس واللون.',
    cta: 'Save + Screenshot + WhatsApp.',
    cover: 'products/linen-set-colours.png',
    assets: [
      'products/linen-set-colours.png',
      'products/summer-set-dark.png',
      'products/summer-set-light.png',
      'generated/cargo-shorts-lost-paradise-4x5.png',
      'generated/cargo-corex-beige-4x5.png',
      'generated/lightweight-trousers-studio.png',
    ],
    notes: 'اكتب اسم الفئة فقط على كل Slide. آخر Slide: “ابعت Screenshot + المقاس”. ثبّت البوست في الخانة الثانية. ممنوع ادعاء خامة أو سعر غير مؤكد.', channel: 'instagram',
  },
  {
    day: '09', time: '18:30', title: 'تأسيس Highlights قبل جلب الزيارات',
    phase: 'Launch foundation', goal: 'تحويل البروفايل الجديد إلى واجهة مفهومة',
    hook: 'New here? كل اللي محتاج تعرفه في 4 Stories.',
    format: 'Stories · 4 frames + Highlights setup',
    platforms: 'Instagram + Facebook Stories',
    caption: 'ابدأ من هنا: الموديلات، طريقة الطلب، تأكيد المقاس واللون، والتوصيل داخل القاهرة والجيزة.',
    cta: 'أنشئ Highlights: START / ORDER / DELIVERY / SIZES.',
    cover: 'products/summer-set-dark.png',
    assets: ['products/summer-set-dark.png', 'products/summer-set-light.png', 'products/linen-set-colours.png', 'products/linen-set-front.png'],
    notes: 'مفيش Poll لأن الحساب جديد. كل Frame يشرح معلومة واحدة. آخر Frame فيه زر/لينك واتساب إن كان متاح.', channel: 'instagram',
  },
  {
    day: '10', time: '21:15', title: '3 Cargo Fits للرجالة',
    phase: 'Launch foundation', goal: 'اكتشاف من البحث والـ Reels',
    hook: '3 cargo outfits تقدر تبدأ بيهم اللوك كله.',
    format: 'Discovery Reel · 9 sec · 9:16',
    platforms: 'Instagram Reels + Facebook Reels + TikTok',
    caption: 'لو بتحب الـ cargo fit: Lost Paradise مع khaki shorts، COREX مع beige cargo، وBAD مع navy cargo. احفظ الفيديو كمرجع وابعتلنا اسم اللوك ومقاسك علشان نأكد التوفر.',
    cta: 'Save + Follow + WhatsApp باسم اللوك. ثبّت الـReel كثالث بوست على البروفايل.',
    cover: 'generated/cargo-shorts-lost-paradise-4x5.png',
    assets: ['generated/cargo-shorts-lost-paradise-story.png', 'generated/cargo-corex-beige-story.png', 'generated/cargo-bad-navy-story.png'],
    notes: 'استخدم الـ 9:16 الأصلية. Hook في أول ثانية، ثم اسم كل fit على الشاشة. أضف كلمات البحث “cargo pants Egypt / ملابس رجالي القاهرة” طبيعيًا في الكابشن. Pin في الخانة الثالثة بعد النشر.', channel: 'tiktok',
  },
  {
    day: '11', time: '20:30', title: 'السعر واضح — 650 + 650',
    phase: 'Product clarity', goal: 'إزالة غموض السعر وبناء ثقة',
    hook: 'اللوك ده قطعتين، وكل قطعة سعرها واضح.',
    format: 'Price carousel · 3 slides',
    platforms: 'Instagram Feed + Facebook',
    caption: 'Lost Paradise T-shirt بـ650 جنيه، والـ cargo shorts بـ650 جنيه. تقدر تطلب قطعة واحدة أو اللوك كامل حسب المتاح. ابعتلنا المقاس ولون الشورت علشان نأكد التوفر قبل الطلب.',
    cta: 'WhatsApp: “LOST LOOK” + المقاس + Khaki/Burgundy.',
    cover: 'generated/cargo-shorts-price-burgundy.png',
    assets: ['generated/cargo-shorts-price-burgundy.png', 'generated/cargo-shorts-price-outfit.png', 'generated/cargo-shorts-khaki-burgundy-outfit.png'],
    notes: 'Slide 3 يلخص: T-shirt 650 / Shorts 650 / التوفر يتأكد. لا تضف Buy 2 Get 1 أو مصاريف توصيل غير مؤكدة.', channel: 'instagram',
  },
  {
    day: '12', time: '20:00', title: 'Lost Paradise — كل الزوايا',
    phase: 'Product clarity', goal: 'Carousel قابل للحفظ يشرح المنتج بدل سؤال جمهور غير موجود',
    hook: 'قبل ما تطلب، شوف اللوك كامل من كل زاوية.',
    format: 'Product carousel · 5 slides',
    platforms: 'Instagram Feed + Facebook',
    caption: 'Lost Paradise مع cargo shorts بالـkhaki أو burgundy. جمعنالك اللوك، الـflat lay، تفاصيل الجيوب والسعر في Carousel واحد علشان تختار وإنت شايف كل حاجة.',
    cta: 'Save + ابعت Screenshot للون المطلوب على WhatsApp.',
    cover: 'generated/cargo-shorts-khaki-burgundy-outfit.png',
    assets: [
      'generated/cargo-shorts-khaki-burgundy-outfit.png',
      'generated/cargo-shorts-lost-paradise-flatlay.png',
      'generated/cargo-shorts-burgundy-flatlay.png',
      'generated/cargo-shorts-price-outfit.png',
      'generated/cargo-shorts-price-burgundy.png',
    ],
    notes: 'Slide order زي القائمة. متكررش 4:5 و9:16 لنفس الكادر داخل الـCarousel؛ استخدمهم للـReels/Stories فقط.', channel: 'instagram',
  },
  {
    day: '13', time: '21:00', title: 'NEW CAST في 7 ثواني',
    phase: 'Discovery', goal: 'Reel بحث لمنتج graphic tee',
    hook: 'لو بتحب graphic tees مختلفة، ركّز في التصميم ده.',
    format: 'Discovery Reel · 7 sec · 9:16',
    platforms: 'Instagram Reels + Facebook Reels + TikTok',
    caption: 'NEW CAST واحد من graphic tees الموجودة عند KINBO. اعمل zoom على التفاصيل، واحفظ اسم التصميم. للطلب ابعتلنا NEW CAST + مقاسك علشان نأكد اللون والتوفر.',
    cta: 'Follow + WhatsApp: NEW CAST + size.',
    cover: 'products/newcast-tee.png',
    assets: ['products/newcast-tee.png', 'products/corex-tee.png', 'products/bad-intentions-tee.jpg'],
    notes: 'ابدأ بـNEW CAST ثم لقطة comparison سريعة مع COREX وBAD. حط كل صورة على canvas 9:16 من غير stretch.', channel: 'tiktok',
  },
  {
    day: '14', time: '20:30', title: 'كتالوج الـ Graphic Tees',
    phase: 'Discovery', goal: 'Carousel واسع للفهرسة والحفظ',
    hook: '6 graphic tees في مكان واحد — احفظ الكتالوج.',
    format: 'Catalog carousel · 7 slides',
    platforms: 'Instagram Feed + Facebook',
    caption: 'BAD، ASANERROR، bull STOP ying، COREX، NEW CAST وYEAR OF THE HORSE. احفظ الكتالوج وابعت Screenshot للتصميم مع المقاس واللون علشان نأكد المتاح.',
    cta: 'Save + Share + WhatsApp بصورة التصميم.',
    cover: 'products/asanerror-tee.jpg',
    assets: [
      'products/bad-intentions-tee.jpg',
      'products/asanerror-tee.jpg',
      'products/bullstop-tee.jpg',
      'products/corex-tee.png',
      'products/newcast-tee.png',
      'products/year-of-horse-tee.png',
    ],
    notes: 'Slide 1 عنوان catalog، ثم تصميم لكل Slide. الصور 1:2 تتوسّط على 4:5 بخلفية داكنة من غير crop أو stretch.', channel: 'instagram',
  },
  {
    day: '15', time: '21:15', title: 'COREX + Beige Cargo',
    phase: 'Discovery', goal: 'إعادة تدوير نفس اللوك بصيغ مناسبة لكل placement',
    hook: 'Green + beige = لوك كامل بلونين.',
    format: 'Discovery Reel · 8 sec · 9:16',
    platforms: 'Instagram Reels + Facebook Reels + TikTok',
    caption: 'COREX green مع beige cargo: contrast هادي واللوك واضح. لو بتدور على cargo pants وتيشيرت oversized في القاهرة أو الجيزة، ابعتلنا COREX FIT + مقاسك.',
    cta: 'Save اللوك + WhatsApp: COREX FIT.',
    cover: 'generated/cargo-corex-beige-story.png',
    assets: ['generated/cargo-corex-beige-story.png', 'generated/cargo-corex-beige-4x5.png', 'generated/cargo-corex-beige-square.png'],
    notes: 'استخدم 9:16 كأساس، والـ4:5/square كـ punch-in transitions. Labels: COREX / BEIGE CARGO / CAIRO + GIZA. ممنوع سعر للبنطلون.', channel: 'tiktok',
  },
  {
    day: '16', time: '18:00', title: 'طريقة الطلب في 3 خطوات',
    phase: 'Profile trust', goal: 'Highlight ثابت يقلل أسئلة الطلب',
    hook: 'الطلب من KINBO بياخد 3 خطوات.',
    format: 'Stories · 4 frames + ORDER Highlight',
    platforms: 'Instagram + Facebook Stories',
    caption: '1) ابعت Screenshot أو اسم القطعة. 2) ابعت المقاس واللون. 3) نستنى تأكيد التوفر والتوصيل داخل القاهرة أو الجيزة.',
    cta: 'WhatsApp مباشر + حفظ في Highlight باسم ORDER.',
    cover: 'products/linen-set-front.png',
    assets: ['products/linen-set-front.png', 'products/linen-set-colours.png', 'generated/cargo-shorts-lost-paradise-4x5.png'],
    notes: 'مفيش Question sticker في أول أسبوع. وضّح الخطوات فقط. ما نذكرش مقاسات أو سرعة/سعر توصيل غير مؤكد.', channel: 'instagram',
  },
  {
    day: '17', time: '21:00', title: 'BAD + Navy Cargo',
    phase: 'Discovery', goal: 'Reel لوك عالي التباين لغير المتابعين',
    hook: 'Cream فوق، navy تحت — اللوك جاهز.',
    format: 'Discovery Reel · 8 sec · 9:16',
    platforms: 'Instagram Reels + Facebook Reels + TikTok',
    caption: 'BAD cream مع navy cargo. لو بتحب streetwear contrast واضح، احفظ اللوك وابعتلنا BAD NAVY + مقاسك علشان نأكد التوفر.',
    cta: 'Save + Follow + WhatsApp: BAD NAVY.',
    cover: 'generated/cargo-bad-navy-story.png',
    assets: ['generated/cargo-bad-navy-story.png', 'generated/cargo-bad-navy-4x5.png', 'generated/cargo-bad-navy-square.png'],
    notes: 'ابدأ crop على BAD ثم reveal للوك. استخدم مشتقات النسب المختلفة كـ transitions. ممنوع سعر للبنطلون.', channel: 'tiktok',
  },
  {
    day: '18', time: '20:30', title: 'SILENT NIGHT — Front / Back / Details',
    phase: 'Product education', goal: 'إثبات تفاصيل المنتج من أصل واحد موثوق',
    hook: 'متطلبش قبل ما تشوف الـfront والـback.',
    format: 'Detail carousel · 4 slides/crops',
    platforms: 'Instagram Feed + Facebook',
    caption: 'SILENT NIGHT من قدام، من ورا، ومع khaki cargo shorts. الـCarousel معمول علشان تشوف الطباعة واللوك قبل ما تسأل عن المقاس واللون.',
    cta: 'Save + WhatsApp باسم SILENT NIGHT.',
    cover: 'generated/cargo-shorts-silent-night-studio.png',
    assets: ['generated/cargo-shorts-silent-night-studio.png'],
    notes: 'Slide 1 الصورة كاملة. Slide 2 crop front. Slide 3 crop back. Slide 4 crop cargo pockets + CTA. لا تخترع صور أو تفاصيل خامة.', channel: 'instagram',
  },
  {
    day: '19', time: '20:00', title: 'دليل الـ Summer Sets',
    phase: 'Product education', goal: 'Carousel كامل للفئة بدل Poll بلا جمهور',
    hook: 'كل الـsets في Carousel واحد.',
    format: 'Product carousel · 6 slides',
    platforms: 'Instagram Feed + Facebook',
    caption: 'Summer sets بالـdark والـlight، وlinen set من قدام ومن ورا وبألوانه. احفظ الدليل وابعت Screenshot للون مع مقاسك علشان نأكد التوفر.',
    cta: 'Save + Share + WhatsApp بصورة اللون.',
    cover: 'products/summer-set-light.png',
    assets: ['products/summer-set-light.png', 'products/summer-set-dark.png', 'products/linen-set-front.png', 'products/linen-set-back.png', 'products/linen-set-colours.png'],
    notes: 'Slide 1 عنوان. Slides 2–6 زي القائمة. لا تذكر خامة أو سعر غير مؤكد.', channel: 'instagram',
  },
  {
    day: '20', time: '21:15', title: 'LOST PARADISE — من Flat Lay للـFit',
    phase: 'Discovery', goal: 'Reel تحول بصري باستخدام مشتقات نفس الأصل',
    hook: 'من flat lay للوك كامل في 8 ثواني.',
    format: 'Transformation Reel · 8 sec · 9:16',
    platforms: 'Instagram Reels + Facebook Reels + TikTok',
    caption: 'LOST PARADISE مع khaki cargo shorts: شوف الـflat lay، التفاصيل واللوك كامل. التيشيرت 650 جنيه والشورت 650 جنيه، والتوفر يتأكد على واتساب.',
    cta: 'Save + WhatsApp: LOST PARADISE LOOK.',
    cover: 'generated/cargo-shorts-lost-paradise-story.png',
    assets: ['generated/cargo-shorts-lost-paradise-story.png', 'generated/cargo-shorts-lost-paradise-4x5.png', 'generated/cargo-shorts-lost-paradise-flatlay.png', 'generated/cargo-shorts-khaki-burgundy-outfit.png'],
    notes: 'ابدأ بالـ9:16 الأصلي. Cuts على beat: story → 4:5 → square detail → full outfit. لا تعمل stretch.', channel: 'tiktok',
  },
  {
    day: '21', time: '20:30', title: '3 لوكات للويك إند',
    phase: 'Product education', goal: 'محتوى styling قابل للحفظ',
    hook: 'لو مش عارف تبدأ منين، دول 3 لوكات للويك إند.',
    format: 'Styling carousel · 5 slides',
    platforms: 'Instagram Feed + Facebook',
    caption: 'Light set للخروجة النهاري، dark set للمود الهادي، وLost Paradise + cargo لو عايز graphic look. احفظ البوست للويك إند وابعتلنا اختيارك ومقاسك.',
    cta: 'Save للويك إند + WhatsApp بالاختيار.',
    cover: 'products/summer-set-light.png',
    assets: ['products/summer-set-light.png', 'products/summer-set-dark.png', 'products/linen-set-front.png', 'generated/cargo-shorts-lost-paradise-4x5.png'],
    notes: 'Slide 1 hook. Slides 2–4 looks. Slide 5 checklist: Screenshot + size + colour. لا سعر أو خامة غير مؤكدة.', channel: 'instagram',
  },
  {
    day: '22', time: '20:30', title: 'Lightweight Trousers — صورتين أوضح من كلام كتير',
    phase: 'Product education', goal: 'شرح بنطلون بدون ادعاء سعر أو خامة',
    hook: 'شوف البنطلون على الـrack وفي flat lay قبل ما تسأل.',
    format: 'Product carousel · 3 slides',
    platforms: 'Instagram Feed + Facebook',
    caption: 'Lightweight black trousers مع white/red horse tee. جمعنالك الـstudio view والـflat lay علشان تشوف شكل البنطلون واللوك بوضوح. السعر والتوفر يتأكدوا على واتساب.',
    cta: 'Save + WhatsApp باسم LIGHTWEIGHT BLACK.',
    cover: 'generated/lightweight-trousers-studio.png',
    assets: ['generated/lightweight-trousers-studio.png', 'generated/lightweight-trousers-flatlay.png', 'products/year-of-horse-tee.png'],
    notes: 'Slide 1 studio. Slide 2 flat lay. Slide 3 tee family/CTA. ممنوع سعر أو ادعاء خامة غير موثق.', channel: 'instagram',
  },
  {
    day: '23', time: '21:00', title: 'Streetwear محلي — القاهرة والجيزة',
    phase: 'Local discovery', goal: 'ربط البراند بالموقع الجغرافي بوضوح',
    hook: 'في القاهرة أو الجيزة وبتدور على streetwear؟',
    format: 'Local discovery Reel · 7 sec · 9:16',
    platforms: 'Instagram Reels + Facebook Reels + TikTok',
    caption: 'KINBO موجود علشان تختار تيشيرت، set أو cargo وتأكد المقاس واللون مباشرة. التوصيل حاليًا داخل القاهرة والجيزة فقط. ابعتلنا منطقتك + اسم القطعة على واتساب.',
    cta: 'Follow + WhatsApp بالمنطقة والقطعة.',
    cover: 'products/linen-set-colours.png',
    assets: ['products/linen-set-colours.png', 'generated/cargo-corex-beige-story.png', 'generated/cargo-bad-navy-story.png', 'generated/cargo-shorts-lost-paradise-story.png'],
    notes: 'النص على الشاشة: CAIRO + GIZA ONLY. استخدم Cairo/Giza geotag. لا تذكر سرعة، مصاريف، COD أو نطاقات أصغر من غير تأكيد.', channel: 'tiktok',
  },
  {
    day: '24', time: '21:00', title: 'bull STOP ying — 3 ألوان',
    phase: 'Discovery', goal: 'استخراج Reel من صورة lineup واحدة',
    hook: 'نفس التصميم، 3 ألوان — كل لون له مود.',
    format: 'Color reveal Reel · 7 sec · 9:16',
    platforms: 'Instagram Reels + Facebook Reels + TikTok',
    caption: 'bull STOP ying بالـburgundy، blue وgreen. لو لقيت اللون المناسب ليك، ابعت Screenshot + المقاس علشان نأكد التوفر.',
    cta: 'Follow + Save + WhatsApp بصورة اللون.',
    cover: 'products/bullstop-tee.jpg',
    assets: ['products/bullstop-tee.jpg'],
    notes: 'استخدم 3 crops من نفس الأصل: burgundy / blue / green ثم reveal كامل. ما تعتمدش على تصويت؛ الهدف إن المشاهد يحفظ أو يرسل Screenshot.', channel: 'tiktok',
  },
  {
    day: '25', time: '20:30', title: 'YEAR OF THE HORSE — تفاصيل اللوك',
    phase: 'Product education', goal: 'ربط التيشيرت بالبنطلون في Carousel واحد',
    hook: 'الأحمر هو اللي رابط اللوك كله.',
    format: 'Detail carousel · 5 slides',
    platforms: 'Instagram Feed + Facebook',
    caption: 'YEAR OF THE HORSE بالـwhite والـblack، ومع lightweight black trousers. شوف الـlineup، الـstudio والـflat lay في بوست واحد واحفظ اللوك.',
    cta: 'Save + WhatsApp باسم HORSE LOOK.',
    cover: 'products/year-of-horse-tee.png',
    assets: ['products/year-of-horse-tee.png', 'generated/lightweight-trousers-studio.png', 'generated/lightweight-trousers-flatlay.png'],
    notes: 'Slide 1 lineup. Slide 2 studio. Slide 3 flat lay. Slides 4–5 crops للتفاصيل وCTA. لا offer banner ولا سعر بنطلون.', channel: 'instagram',
  },
  {
    day: '26', time: '20:30', title: 'COREX بطريقتين',
    phase: 'Product education', goal: 'Carousel يربط المنتج المنفرد بالـfull fit',
    hook: 'شوف COREX لوحده وبعد ما يدخل في full fit.',
    format: 'Before/after carousel · 4 slides',
    platforms: 'Instagram Feed + Facebook',
    caption: 'COREX من صورة الكتالوج للـfull fit مع beige cargo. البوست ده بيسهّل عليك تشوف التصميم واللوك النهائي قبل الطلب.',
    cta: 'Save + WhatsApp: COREX + size.',
    cover: 'products/corex-tee.png',
    assets: ['products/corex-tee.png', 'generated/cargo-corex-beige-square.png', 'generated/cargo-corex-beige-4x5.png', 'generated/cargo-corex-beige-story.png'],
    notes: 'Slide 1 product. Slide 2 square full fit. Slide 3 4:5. Slide 4 CTA. لا تعرض نفس ratio مرتين بدون وظيفة مختلفة.', channel: 'instagram',
  },
  {
    day: '27', time: '21:15', title: 'من الـRack للـFlat Lay',
    phase: 'Discovery', goal: 'Reel سريع متعدد المنتجات يوضح أسلوب التصوير',
    hook: '3 طرق تشوف بيهم اللوك قبل ما تطلب.',
    format: 'Discovery Reel · 9 sec · 9:16',
    platforms: 'Instagram Reels + Facebook Reels + TikTok',
    caption: 'Rack، flat lay وfull fit — علشان تشوف القطع بوضوح قبل الطلب. احفظ الفيديو وابعت Screenshot للوك اللي عجبك.',
    cta: 'Save + Follow + WhatsApp بالـScreenshot.',
    cover: 'generated/cargo-shorts-bad-studio.png',
    assets: ['generated/cargo-shorts-bad-studio.png', 'generated/cargo-shorts-lost-paradise-flatlay.png', 'generated/lightweight-trousers-studio.png', 'generated/cargo-shorts-khaki-burgundy-outfit.png'],
    notes: 'كل asset لمدة 1.5–2 ثانية مع label RACK / FLAT LAY / FULL FIT. Ending: CAIRO + GIZA / WHATSAPP.', channel: 'tiktok',
  },
  {
    day: '28', time: '20:30', title: 'Linen Set — الدليل الكامل',
    phase: 'Product education', goal: 'Carousel حفظ يوضح front/back/colours',
    hook: 'Front، back وكل الألوان في بوست واحد.',
    format: 'Product guide carousel · 5 slides',
    platforms: 'Instagram Feed + Facebook',
    caption: 'Linen set من قدام ومن ورا وبالألوان المتاحة في الصور. احفظ الدليل وابعت Screenshot للون مع مقاسك علشان نأكد التوفر. التوصيل داخل القاهرة والجيزة فقط.',
    cta: 'Save + WhatsApp بصورة اللون والمقاس.',
    cover: 'products/linen-set-front.png',
    assets: ['products/linen-set-front.png', 'products/linen-set-back.png', 'products/linen-set-colours.png'],
    notes: 'Slide 1 front. Slide 2 back. Slide 3 colours. Slide 4 crop details. Slide 5 order steps. لا ادعاء خامة أو سعر غير مؤكد.', channel: 'instagram',
  },
  {
    day: '29', time: '21:30', title: '3 Graphic Tees في 7 ثواني',
    phase: 'Discovery', goal: 'اختبار hook ومنتجات مختلفة بلا اعتماد على المتابعين',
    hook: 'لو الـplain tee مش ليك، التلاتة دول ممكن يكونوا.',
    format: 'Discovery Reel · 7 sec · 9:16',
    platforms: 'Instagram Reels + Facebook Reels + TikTok',
    caption: 'BAD، ASANERROR وNEW CAST — 3 graphic tees من KINBO. احفظ اسم التصميم وابعتلنا المقاس واللون علشان نأكد المتاح.',
    cta: 'Follow + Save + WhatsApp باسم التصميم.',
    cover: 'products/bad-intentions-tee.jpg',
    assets: ['products/bad-intentions-tee.jpg', 'products/asanerror-tee.jpg', 'products/newcast-tee.png'],
    notes: 'Hook 0–1s، كل تصميم 2s، CTA آخر ثانية. استخدم audio native وقت النشر؛ لا تستخدم “اختار رقم” كهدف أساسي.', channel: 'tiktok',
  },
  {
    day: '30', time: '20:00', title: 'لو أول مرة تشوف KINBO — ابدأ هنا',
    phase: 'Conversion', goal: 'بوست مرجعي للقادمين الجدد من Reels',
    hook: 'وصلت جديد؟ دي أسرع جولة في KINBO.',
    format: 'Start-here carousel · 6 slides',
    platforms: 'Instagram Feed + Facebook',
    caption: 'لو أول مرة تشوفنا: عندنا graphic tees، sets، cargo وlightweight trousers. الطلب بيتأكد على واتساب بالمقاس واللون، والتوصيل داخل القاهرة والجيزة فقط.',
    cta: 'Save + Visit profile + WhatsApp بصورة اللوك.',
    cover: 'generated/cargo-corex-beige-4x5.png',
    assets: ['generated/cargo-corex-beige-4x5.png', 'generated/cargo-bad-navy-4x5.png', 'generated/cargo-shorts-lost-paradise-4x5.png', 'products/linen-set-colours.png', 'products/year-of-horse-tee.png'],
    notes: 'Slide 1 hook. Slides 2–5 categories. Slide 6 order/delivery. لا تدّعي best seller أو آراء عملاء قبل وجود بيانات حقيقية.', channel: 'instagram',
  },
  {
    day: '31', time: '21:00', title: 'August Launch Lookbook',
    phase: 'Conversion', goal: 'تجميع أقوى أصول الشهر في Lookbook قابل للحفظ',
    hook: 'أول Lookbook من KINBO — كل الستايلات في مكان واحد.',
    format: 'Lookbook carousel · 8 slides',
    platforms: 'Instagram Feed + Facebook · TikTok Photo Mode',
    caption: 'أول شهر لـKINBO: graphic tees، sets وcargo fits. احفظ الـLookbook وابعت Screenshot للقطعة + المقاس + اللون علشان نأكد التوفر. التوصيل داخل القاهرة والجيزة فقط.',
    cta: 'Save + Follow لسبتمبر + WhatsApp بالـScreenshot.',
    cover: 'generated/cargo-shorts-lost-paradise-4x5.png',
    assets: [
      'generated/cargo-shorts-lost-paradise-4x5.png',
      'generated/cargo-corex-beige-4x5.png',
      'generated/cargo-bad-navy-4x5.png',
      'generated/lightweight-trousers-studio.png',
      'products/linen-set-colours.png',
      'products/summer-set-dark.png',
      'products/bad-intentions-tee.jpg',
    ],
    notes: 'Slide 1 cover ثم 7 looks. انشر Photo Mode على TikTok. بعد 72 ساعة راجع reach من non-followers، saves، profile visits وWhatsApp clicks لتخطيط سبتمبر.', channel: 'instagram',
  },
];

function scheduledAt(day: string, time: string) {
  return new Date(`2026-08-${day}T${time}:00+03:00`).toISOString();
}

function stableTitle(post: SeedPost) {
  return `KINBO · ${post.day}/08 · ${post.title}`;
}

function body(post: SeedPost) {
  return [
    `مرحلة الإطلاق: ${post.phase}`,
    `الهدف: ${post.goal}`,
    `Hook / أول Frame:\n${post.hook}`,
    `الكابشن المقترح:\n${post.caption}`,
    `التنفيذ:\n${post.format}\nالمنصات: ${post.platforms}`,
    `ترتيب الصور/اللقطات:\n${post.assets.map((asset, index) => `${index + 1}. ${asset}`).join('\n')}`,
    `CTA:\n${post.cta}`,
    `ملاحظات الإنتاج:\n${post.notes}`,
    'قواعد الإطلاق: الحساب جديد، لذلك الأولوية للـReels والاكتشاف والـSave/Share/Profile Visit؛ لا تعتمد على Poll أو UGC أو Best Seller من غير بيانات حقيقية. استخدم 3–5 hashtags مرتبطة فقط مثل #KINBO #ملابس_رجالي #ستايل_رجالي #ستريت_وير مع #القاهرة أو #الجيزة، وأضف geotag محلي. أي طلب يتأكد فيه المقاس واللون والتوفر. التوصيل داخل القاهرة والجيزة فقط.',
  ].join('\n\n');
}

function mimeType(filename: string) {
  return filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')
    ? 'image/jpeg'
    : 'image/png';
}

async function uploadCover(ctx: Awaited<ReturnType<typeof getOwnerContext>>, relativePath: string) {
  const fullPath = path.join(IMAGE_ROOT, relativePath);
  const bytes = await fs.readFile(fullPath);
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return uploadContentImage(ctx, {
    name: path.basename(fullPath),
    type: mimeType(fullPath),
    bytes: arrayBuffer,
  });
}

const uploadedAssets = new Map<string, Promise<string>>();

function uploadAssetOnce(
  ctx: Awaited<ReturnType<typeof getOwnerContext>>,
  relativePath: string,
) {
  const pending = uploadedAssets.get(relativePath) ?? uploadCover(ctx, relativePath);
  uploadedAssets.set(relativePath, pending);
  return pending;
}

function uploadGallery(
  ctx: Awaited<ReturnType<typeof getOwnerContext>>,
  relativePaths: readonly string[],
) {
  return Promise.all(relativePaths.map((relativePath) => uploadAssetOnce(ctx, relativePath)));
}

const ctx = await getOwnerContext();
let project = await getProjectBySlug(ctx, 'kinbo-store');
if (!project) {
  project = await createProject(ctx, {
    name: 'KINBO Store',
    slug: 'kinbo-store',
    clientName: 'KINBO Store',
    status: 'active',
  });
  console.log(`Created project: ${project.name}`);
}

const existing = await listContentPosts(
  ctx,
  { fromIso: '2026-08-01T00:00:00.000Z', toIso: '2026-09-01T00:00:00.000Z' },
  { projectId: project.id },
);
const byTitle = new Map(existing.map((post) => [post.title, post]));
const byDay = new Map(
  existing.flatMap((post) => {
    const day = /^KINBO · (\d{2})\/08 ·/.exec(post.title)?.[1];
    return day ? [[day, post] as const] : [];
  }),
);
const forceSync = process.argv.includes('--force');
const refreshImages = process.argv.includes('--refresh-images');

let created = 0;
let updated = 0;
let skipped = 0;
for (const post of posts) {
  const title = stableTitle(post);
  // The launch strategy can replace a day's concept and therefore its title. Match the
  // existing one-post-per-day KINBO slot first, then fall back to the exact stable title.
  const found = byDay.get(post.day) ?? byTitle.get(title);
  if (found) {
    if (!forceSync) {
      skipped++;
      continue;
    }
    const currentPaths = decodeContentImagePaths(found.image_path);
    const imagePaths =
      !refreshImages && currentPaths.length === post.assets.length
        ? currentPaths
        : await uploadGallery(ctx, post.assets);
    await updateContentPost(
      ctx,
      found.id,
      {
        project_id: project.id,
        title,
        body: body(post),
        channel: post.channel,
        status: 'scheduled',
        scheduled_at: scheduledAt(post.day, post.time),
        image_path: encodeContentImagePaths(imagePaths),
        image_url: null,
      },
      'synchronised from the KINBO zero-audience launch plan',
    );
    updated++;
    continue;
  }

  const imagePaths = await uploadGallery(ctx, post.assets);
  await createContentPost(ctx, {
    projectId: project.id,
    title,
    body: body(post),
    channel: post.channel,
    status: 'scheduled',
    scheduledAt: scheduledAt(post.day, post.time),
    imagePaths,
  });
  created++;
}

console.log(
  `KINBO calendar synced: ${created} created, ${updated} updated, ${skipped} already current, ${posts.length} total.`,
);
