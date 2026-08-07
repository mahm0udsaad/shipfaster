/**
 * Seeds KINBO's 6–31 August 2026 Egyptian content calendar into the live dashboard.
 *
 * Safe to rerun: entries are keyed by their August day slot. Existing rows are updated and
 * their stored galleries are preserved unless their size changed or --refresh-images is used.
 *
 * Run:
 *   node --env-file=.env.local --import tsx/esm scripts/seed-kinbo-calendar.ts
 *   node --env-file=.env.local --import tsx/esm scripts/seed-kinbo-calendar.ts --force
 *   node --env-file=.env.local --import tsx/esm scripts/seed-kinbo-calendar.ts --force --refresh-images
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

const IMAGE_ROOT = '/Users/mahmoudmac/Documents/marketing';

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
    hook: 'أول مرة تشوف KINBO؟ دي أسرع لفة في اللي موجود عندنا.',
    format: 'Pinned carousel · 6 slides',
    platforms: 'Instagram Feed + Facebook',
    caption: 'أهلاً بيك في KINBO 👋 هنا هتلاقي اختيارات streetwear تقدر تشوفها بوضوح قبل ما تطلب. ابعتلنا Screenshot للقطعة مع المقاس واللون على واتساب، وهنأكدلك المتاح. التوصيل داخل القاهرة والجيزة بس. #KINBO #ستريت_وير_مصر #ملابس_رجالي',
    cta: 'Follow + Save. ثبّت البوست في أول خانة على البروفايل.',
    cover: 'kinbo-website/public/images/brand/showroom.jpg',
    assets: [
      'kinbo-website/public/images/brand/showroom.jpg',
      'KINBO_UPLOAD/1_TRY_ON/01_stay-sharp_green.jpg',
      'KINBO_UPLOAD/2_COLOURWAY/corex_4colours.jpg',
      'KINBO_UPLOAD/2_COLOURWAY/linen-shirts_3colours.jpg',
      'KINBO_UPLOAD/2_COLOURWAY/shorts_4colours.jpg',
      'kinbo-website/public/images/brand/logo.jpg',
    ],
    notes: 'Slide 1 واجهة المكان + “ابدأ من هنا”. Slides 2–5 اختيارات حقيقية من الأصول الجاهزة. Slide 6 اللوجو + واتساب + القاهرة والجيزة. ثبّت البوست في أول خانة.', channel: 'instagram',
  },
  {
    day: '07', time: '21:00', title: '5 اختيارات في 9 ثواني',
    phase: 'Launch foundation', goal: 'أول Reel اكتشاف لغير المتابعين',
    hook: 'لو الـplain مش مودك، شوف الخمس اختيارات دول.',
    format: 'Discovery Reel · 9 sec · 9:16',
    platforms: 'Instagram Reels + Facebook Reels + TikTok',
    caption: 'خمس اختيارات وكل واحدة بمود مختلف. وقف الفيديو عند اللي عجبك وابعتلنا Screenshot مع مقاسك على واتساب علشان نأكد اللون والتوفر. التوصيل داخل القاهرة والجيزة بس. #KINBO #تيشيرتات_رجالي #ستريت_وير_مصر',
    cta: 'Follow للموديلات الجاية + WhatsApp للتوفر.',
    cover: 'KINBO_UPLOAD/1_TRY_ON/01_stay-sharp_green.jpg',
    assets: ['KINBO_UPLOAD/1_TRY_ON/01_stay-sharp_green.jpg', 'KINBO_UPLOAD/1_TRY_ON/02_newcast_maroon.jpg', 'KINBO_UPLOAD/1_TRY_ON/03_newcast_green.jpg', 'KINBO_UPLOAD/1_TRY_ON/04_crochet_olive.jpg', 'KINBO_UPLOAD/1_TRY_ON/05_crochet_cream.jpg'],
    notes: '0–1s hook كبير، ثم 1.5 ثانية لكل اختيار. اعمل pan/zoom خفيف من الصور الـ4:5 داخل canvas 9:16. اختار audio native وقت النشر وأضف Cairo geotag.', channel: 'tiktok',
  },
  {
    day: '08', time: '20:00', title: 'دليل الألوان — احفظه قبل ما تختار',
    phase: 'Launch foundation', goal: 'إظهار تنوع الكتالوج وبناء ثاني بوست مثبت',
    hook: 'كل الـcolourways الجاهزة في Carousel واحد.',
    format: 'Saveable colourway carousel · 8 slides',
    platforms: 'Instagram Feed + Facebook',
    caption: 'اختيار اللون بيبقى أسهل لما تشوفهم جنب بعض. احفظ البوست، وابعتلنا Screenshot للتصميم واللون مع مقاسك على واتساب علشان نأكد المتاح. التوصيل داخل القاهرة والجيزة بس. #KINBO #ستايل_رجالي #ملابس_رجالي',
    cta: 'Save + Screenshot + WhatsApp.',
    cover: 'KINBO_UPLOAD/2_COLOURWAY/bullying_3colours.jpg',
    assets: [
      'KINBO_UPLOAD/2_COLOURWAY/bullying_3colours.jpg',
      'KINBO_UPLOAD/2_COLOURWAY/corex_4colours.jpg',
      'KINBO_UPLOAD/2_COLOURWAY/linen-shirts_3colours.jpg',
      'KINBO_UPLOAD/2_COLOURWAY/maf_2colours.jpg',
      'KINBO_UPLOAD/2_COLOURWAY/shorts_4colours.jpg',
      'KINBO_UPLOAD/2_COLOURWAY/staysharp_3colours.jpg',
      'KINBO_UPLOAD/2_COLOURWAY/wasted_3colours.jpg',
      'KINBO_UPLOAD/2_COLOURWAY/wormhole_3colours.jpg',
    ],
    notes: 'كل أصل 4:5 يبقى Slide كامل من غير إعادة تصميم. ضيف رقم Slide صغير فقط. آخر Slide عليه CTA بسيط فوق مساحة فاضية لو متاحة. ثبّت البوست في الخانة الثانية.', channel: 'instagram',
  },
  {
    day: '09', time: '18:30', title: 'تأسيس Highlights قبل جلب الزيارات',
    phase: 'Launch foundation', goal: 'تحويل البروفايل الجديد إلى واجهة مفهومة',
    hook: 'New here? كل اللي محتاج تعرفه في 4 Stories.',
    format: 'Stories · 4 frames + Highlights setup',
    platforms: 'Instagram + Facebook Stories',
    caption: 'أول مرة تشوف KINBO؟ ابدأ من هنا: شوف الموديلات، اختار القطعة، وابعت المقاس واللون على واتساب علشان نأكد المتاح. التوصيل داخل القاهرة والجيزة بس. #KINBO #طريقة_الطلب #ستريت_وير_مصر',
    cta: 'أنشئ Highlights: START / ORDER / DELIVERY / SIZES.',
    cover: 'kinbo-website/public/images/brand/logo.jpg',
    assets: ['kinbo-website/public/images/brand/logo.jpg', 'kinbo-website/public/images/brand/showroom.jpg', 'KINBO_UPLOAD/1_TRY_ON/01_stay-sharp_green.jpg', 'KINBO_UPLOAD/2_COLOURWAY/corex_4colours.jpg', 'KINBO_UPLOAD/2_COLOURWAY/linen-shirts_3colours.jpg'],
    notes: 'مفيش Poll لأن الحساب جديد. كل Frame يشرح معلومة واحدة. آخر Frame فيه زر/لينك واتساب إن كان متاح.', channel: 'instagram',
  },
  {
    day: '10', time: '21:15', title: '3 Cargo Fits للرجالة',
    phase: 'Launch foundation', goal: 'اكتشاف من البحث والـ Reels',
    hook: '3 cargo outfits تقدر تبدأ بيهم اللوك كله.',
    format: 'Discovery Reel · 9 sec · 9:16',
    platforms: 'Instagram Reels + Facebook Reels + TikTok',
    caption: 'لو بتحب الـcargo fit، عندك 3 تنسيقات: Lost Paradise مع khaki، وCOREX مع beige، وBAD مع navy. احفظ الفيديو وابعتلنا اسم اللوك ومقاسك على واتساب علشان نأكد المتاح. التوصيل داخل القاهرة والجيزة بس. #KINBO #كارجو #ستايل_رجالي',
    cta: 'Save + Follow + WhatsApp باسم اللوك. ثبّت الـReel كثالث بوست على البروفايل.',
    cover: 'kinbo-website/public/images/generated/cargo-shorts-lost-paradise-4x5.png',
    assets: ['kinbo-website/public/images/generated/cargo-shorts-lost-paradise-story.png', 'kinbo-website/public/images/generated/cargo-corex-beige-story.png', 'kinbo-website/public/images/generated/cargo-bad-navy-story.png'],
    notes: 'استخدم الـ 9:16 الأصلية. Hook في أول ثانية، ثم اسم كل fit على الشاشة. أضف كلمات البحث “cargo pants Egypt / ملابس رجالي القاهرة” طبيعيًا في الكابشن. Pin في الخانة الثالثة بعد النشر.', channel: 'tiktok',
  },
  {
    day: '11', time: '20:30', title: 'السعر واضح — 650 + 650',
    phase: 'Product clarity', goal: 'إزالة غموض السعر وبناء ثقة',
    hook: 'اللوك ده قطعتين، وكل قطعة سعرها واضح.',
    format: 'Price carousel · 3 slides',
    platforms: 'Instagram Feed + Facebook',
    caption: 'تيشيرت Lost Paradise بـ650 جنيه، والـcargo shorts بـ650 جنيه. تقدر تطلب كل قطعة لوحدها أو اللوك كامل حسب المتاح. ابعت المقاس ولون الشورت على واتساب للتأكيد. التوصيل داخل القاهرة والجيزة بس. #KINBO #ملابس_رجالي #كارجو',
    cta: 'WhatsApp: “LOST LOOK” + المقاس + Khaki/Burgundy.',
    cover: 'kinbo-website/public/images/generated/cargo-shorts-price-burgundy.png',
    assets: ['kinbo-website/public/images/generated/cargo-shorts-price-burgundy.png', 'kinbo-website/public/images/generated/cargo-shorts-price-outfit.png', 'kinbo-website/public/images/generated/cargo-shorts-khaki-burgundy-outfit.png'],
    notes: 'Slide 3 يلخص: T-shirt 650 / Shorts 650 / التوفر يتأكد. لا تضف Buy 2 Get 1 أو مصاريف توصيل غير مؤكدة.', channel: 'instagram',
  },
  {
    day: '12', time: '20:00', title: 'Lost Paradise — كل الزوايا',
    phase: 'Product clarity', goal: 'Carousel قابل للحفظ يشرح المنتج بدل سؤال جمهور غير موجود',
    hook: 'قبل ما تطلب، شوف اللوك كامل من كل زاوية.',
    format: 'Product carousel · 5 slides',
    platforms: 'Instagram Feed + Facebook',
    caption: 'Lost Paradise مع cargo shorts بالـkhaki أو الـburgundy. شوف اللوك والتفاصيل والسعر، وبعدها ابعت Screenshot باللون والمقاس على واتساب. التوصيل داخل القاهرة والجيزة بس. #KINBO #LostParadise #كارجو',
    cta: 'Save + ابعت Screenshot للون المطلوب على WhatsApp.',
    cover: 'kinbo-website/public/images/generated/cargo-shorts-khaki-burgundy-outfit.png',
    assets: [
      'kinbo-website/public/images/generated/cargo-shorts-khaki-burgundy-outfit.png',
      'kinbo-website/public/images/generated/cargo-shorts-lost-paradise-flatlay.png',
      'kinbo-website/public/images/generated/cargo-shorts-burgundy-flatlay.png',
      'KINBO_UPLOAD/2_COLOURWAY/shorts_4colours.jpg',
      'kinbo-website/public/images/generated/cargo-shorts-price-outfit.png',
      'kinbo-website/public/images/generated/cargo-shorts-price-burgundy.png',
    ],
    notes: 'Slide order زي القائمة. متكررش 4:5 و9:16 لنفس الكادر داخل الـCarousel؛ استخدمهم للـReels/Stories فقط.', channel: 'instagram',
  },
  {
    day: '13', time: '21:00', title: 'NEW CAST — لونين وزاوية أوضح',
    phase: 'Discovery', goal: 'Reel بحث لمنتج graphic tee',
    hook: 'لو بتحب graphic tees مختلفة، ركّز في التصميم ده.',
    format: 'Discovery Reel · 7 sec · 9:16',
    platforms: 'Instagram Reels + Facebook Reels + TikTok',
    caption: 'NEW CAST بالـmaroon والـgreen. وقف الفيديو عند اللون اللي عجبك وابعتلنا اللون والمقاس على واتساب علشان نأكد المتاح. التوصيل داخل القاهرة والجيزة بس. #KINBO #GraphicTees #تيشيرتات_رجالي',
    cta: 'Follow + WhatsApp: NEW CAST + size.',
    cover: 'KINBO_UPLOAD/1_TRY_ON/02_newcast_maroon.jpg',
    assets: ['KINBO_UPLOAD/1_TRY_ON/02_newcast_maroon.jpg', 'KINBO_UPLOAD/1_TRY_ON/03_newcast_green.jpg', 'kinbo-website/public/images/products/newcast-tee.png'],
    notes: 'ابدأ بالـmaroon ثم green، واختم بصورة المنتج. حط الصور على canvas 9:16 من غير stretch، واسم اللون على الشاشة.', channel: 'tiktok',
  },
  {
    day: '14', time: '20:30', title: 'من صورة القطعة للـColourway',
    phase: 'Discovery', goal: 'Carousel يربط شكل القطعة باختيارات اللون المتاحة في الصور',
    hook: 'شوف القطعة لوحدها، وبعدها قارن الـcolourways.',
    format: 'Product plate + colourway carousel · 8 slides',
    platforms: 'Instagram Feed + Facebook',
    caption: 'مرة القطعة لوحدها ومرة الألوان جنب بعض. لف في الصور واحفظ اختيارك، وبعدها ابعت Screenshot للقطعة واللون مع مقاسك على واتساب. التوصيل داخل القاهرة والجيزة بس. #KINBO #ستايل_رجالي #ستريت_وير_مصر',
    cta: 'Save + Share + WhatsApp بصورة التصميم.',
    cover: 'KINBO_UPLOAD/1_TRY_ON/01_stay-sharp_green.jpg',
    assets: [
      'KINBO_UPLOAD/1_TRY_ON/01_stay-sharp_green.jpg',
      'KINBO_UPLOAD/2_COLOURWAY/staysharp_3colours.jpg',
      'KINBO_UPLOAD/1_TRY_ON/02_newcast_maroon.jpg',
      'KINBO_UPLOAD/1_TRY_ON/03_newcast_green.jpg',
      'KINBO_UPLOAD/1_TRY_ON/04_crochet_olive.jpg',
      'KINBO_UPLOAD/1_TRY_ON/05_crochet_cream.jpg',
      'KINBO_UPLOAD/3_BLACK_CAMO/01_camo_blue.jpg',
      'KINBO_UPLOAD/3_BLACK_CAMO/02_camo_white-grey.jpg',
    ],
    notes: 'رتّب كل صور المنتج جنب بعض. الصور أصلًا 4:5؛ لا تضف borders أو mockups. الغرض حفظ ومقارنة، مش ادعاء إن كل الألوان متاحة قبل تأكيد واتساب.', channel: 'instagram',
  },
  {
    day: '15', time: '21:15', title: 'COREX + Beige Cargo',
    phase: 'Discovery', goal: 'إعادة تدوير نفس اللوك بصيغ مناسبة لكل placement',
    hook: 'Green + beige = لوك كامل بلونين.',
    format: 'Discovery Reel · 8 sec · 9:16',
    platforms: 'Instagram Reels + Facebook Reels + TikTok',
    caption: 'COREX green مع beige cargo: لونين هاديين واللوك كامل. لو عجبك التنسيق ابعتلنا COREX FIT مع مقاسك على واتساب علشان نأكد المتاح. التوصيل داخل القاهرة والجيزة بس. #KINBO #COREX #ستايل_رجالي',
    cta: 'Save اللوك + WhatsApp: COREX FIT.',
    cover: 'kinbo-website/public/images/generated/cargo-corex-beige-story.png',
    assets: ['kinbo-website/public/images/generated/cargo-corex-beige-story.png', 'kinbo-website/public/images/generated/cargo-corex-beige-4x5.png', 'kinbo-website/public/images/generated/cargo-corex-beige-square.png', 'KINBO_UPLOAD/2_COLOURWAY/corex_4colours.jpg'],
    notes: 'استخدم 9:16 كأساس، والـ4:5/square كـ punch-in transitions. Labels: COREX / BEIGE CARGO / CAIRO + GIZA. ممنوع سعر للبنطلون.', channel: 'tiktok',
  },
  {
    day: '16', time: '18:00', title: 'طريقة الطلب في 3 خطوات',
    phase: 'Profile trust', goal: 'Highlight ثابت يقلل أسئلة الطلب',
    hook: 'الطلب من KINBO بياخد 3 خطوات.',
    format: 'Stories · 4 frames + ORDER Highlight',
    platforms: 'Instagram + Facebook Stories',
    caption: 'الطلب بسيط: ابعت Screenshot أو اسم القطعة على واتساب، واكتب المقاس واللون. هنراجع المتاح ونأكدلك الطلب. التوصيل داخل القاهرة والجيزة بس. #KINBO #طريقة_الطلب #ملابس_رجالي',
    cta: 'WhatsApp مباشر + حفظ في Highlight باسم ORDER.',
    cover: 'kinbo-website/public/images/brand/logo.jpg',
    assets: ['kinbo-website/public/images/brand/logo.jpg', 'KINBO_UPLOAD/1_TRY_ON/01_stay-sharp_green.jpg', 'KINBO_UPLOAD/2_COLOURWAY/corex_4colours.jpg', 'KINBO_UPLOAD/2_COLOURWAY/shorts_4colours.jpg'],
    notes: 'مفيش Question sticker في أول أسبوع. وضّح الخطوات فقط. ما نذكرش مقاسات أو سرعة/سعر توصيل غير مؤكد.', channel: 'instagram',
  },
  {
    day: '17', time: '21:00', title: 'BAD + Navy Cargo',
    phase: 'Discovery', goal: 'Reel لوك عالي التباين لغير المتابعين',
    hook: 'Cream فوق، navy تحت — اللوك جاهز.',
    format: 'Discovery Reel · 8 sec · 9:16',
    platforms: 'Instagram Reels + Facebook Reels + TikTok',
    caption: 'BAD cream مع navy cargo؛ contrast واضح من غير ألوان كتير. احفظ اللوك وابعتلنا BAD NAVY مع مقاسك على واتساب علشان نأكد المتاح. التوصيل داخل القاهرة والجيزة بس. #KINBO #ستايل_رجالي #ستريت_وير_مصر',
    cta: 'Save + Follow + WhatsApp: BAD NAVY.',
    cover: 'kinbo-website/public/images/generated/cargo-bad-navy-story.png',
    assets: ['kinbo-website/public/images/generated/cargo-bad-navy-story.png', 'kinbo-website/public/images/generated/cargo-bad-navy-4x5.png', 'kinbo-website/public/images/generated/cargo-bad-navy-square.png'],
    notes: 'ابدأ crop على BAD ثم reveal للوك. استخدم مشتقات النسب المختلفة كـ transitions. ممنوع سعر للبنطلون.', channel: 'tiktok',
  },
  {
    day: '18', time: '20:30', title: 'SILENT NIGHT — Front / Back / Details',
    phase: 'Product education', goal: 'إثبات تفاصيل المنتج من أصل واحد موثوق',
    hook: 'متطلبش قبل ما تشوف الـfront والـback.',
    format: 'Detail carousel · 4 slides/crops',
    platforms: 'Instagram Feed + Facebook',
    caption: 'SILENT NIGHT من قدام ومن ورا، ومعاه تنسيق بالـkhaki cargo. لف في الصور وشوف التفاصيل، وبعدها ابعت اللون والمقاس على واتساب. التوصيل داخل القاهرة والجيزة بس. #KINBO #SilentNight #تيشيرتات_رجالي',
    cta: 'Save + WhatsApp باسم SILENT NIGHT.',
    cover: 'kinbo/new-phone-shots/generated-examples/silent-night-white-front-back-v1.png',
    assets: ['kinbo/new-phone-shots/generated-examples/silent-night-white-front-back-v1.png', 'kinbo/new-phone-shots/generated-examples/silent-night-black-front-back-v1.png', 'kinbo-website/public/images/generated/cargo-shorts-silent-night-studio.png'],
    notes: 'Slide 1 النسخة البيضاء front/back. Slide 2 النسخة السوداء. Slide 3 اللوك على الـrack. Slide 4 crop للـcargo + CTA. دي الأصول الوحيدة المعتمدة من Batch 1/2؛ لا تدخل AWAKEN أو patterned masters المعلّقة.', channel: 'instagram',
  },
  {
    day: '19', time: '20:00', title: 'Beach Flat-Lays — لوكين للصيف',
    phase: 'Product education', goal: 'Carousel كامل للفئة بدل Poll بلا جمهور',
    hook: 'اللوك على الرمل أوضح من المانيكان.',
    format: 'Beach flat-lay carousel · 4 slides',
    platforms: 'Instagram Feed + Facebook',
    caption: 'لوكين للصيف على الرمل: striped shorts مع crochet، وsolid shorts مع ASANERROR. التيشيرت بـ650 جنيه، وسعر الشورت بيتأكد على واتساب. ابعت Screenshot للوك مع المقاس واللون. التوصيل داخل القاهرة والجيزة بس. #KINBO #ستايل_صيفي #ملابس_رجالي',
    cta: 'Save + Share + WhatsApp بصورة اللون.',
    cover: 'kinbo/new-phone-shots/generated/batch-12-downloads-summer/look-02-striped-swim-beach-flatlay-4x5-v1.png',
    assets: ['kinbo/new-phone-shots/generated/batch-12-downloads-summer/look-02-striped-swim-beach-flatlay-4x5-v1.png', 'kinbo/new-phone-shots/generated/batch-12-downloads-summer/look-03-asanerror-solid-shorts-beach-flatlay-4x5-v2.png', 'kinbo-website/public/images/products/asanerror-tee.jpg', 'kinbo-website/public/images/products/summer-set-light.png'],
    notes: 'الـflat-lay هو الـhero. السعر الرقمي للتيشيرت فقط؛ الشورت Price on WhatsApp لحد التأكيد. المانيكان/الـwhite background مش ضمن الكاروسيل.', channel: 'instagram',
  },
  {
    day: '20', time: '21:15', title: 'LOST PARADISE — من Flat Lay للـFit',
    phase: 'Discovery', goal: 'Reel تحول بصري باستخدام مشتقات نفس الأصل',
    hook: 'من flat lay للوك كامل في 8 ثواني.',
    format: 'Transformation Reel · 8 sec · 9:16',
    platforms: 'Instagram Reels + Facebook Reels + TikTok',
    caption: 'من الـflat lay للوك كامل: Lost Paradise مع khaki cargo. التيشيرت بـ650 جنيه والشورت بـ650 جنيه. ابعت المقاس على واتساب علشان نأكد المتاح. التوصيل داخل القاهرة والجيزة بس. #KINBO #LostParadise #ستايل_رجالي',
    cta: 'Save + WhatsApp: LOST PARADISE LOOK.',
    cover: 'kinbo-website/public/images/generated/cargo-shorts-lost-paradise-story.png',
    assets: ['kinbo-website/public/images/generated/cargo-shorts-lost-paradise-story.png', 'kinbo-website/public/images/generated/cargo-shorts-lost-paradise-4x5.png', 'kinbo-website/public/images/generated/cargo-shorts-lost-paradise-flatlay.png', 'kinbo-website/public/images/generated/cargo-shorts-khaki-burgundy-outfit.png'],
    notes: 'ابدأ بالـ9:16 الأصلي. Cuts على beat: story → 4:5 → square detail → full outfit. لا تعمل stretch.', channel: 'tiktok',
  },
  {
    day: '21', time: '20:30', title: '3 لوكات للويك إند',
    phase: 'Product education', goal: 'محتوى styling قابل للحفظ',
    hook: 'لو مش عارف تبدأ منين، دول 3 لوكات للويك إند.',
    format: 'Styling carousel · 5 slides',
    platforms: 'Instagram Feed + Facebook',
    caption: 'للويك إند: striped shorts مع crochet، أو ASANERROR مع شورت سادة، أو cargo مع graphic tee. احفظ اللوك اللي عجبك وابعت Screenshot مع المقاس على واتساب. التوصيل داخل القاهرة والجيزة بس. #KINBO #ستايل_الويك_إند #ملابس_رجالي',
    cta: 'Save للويك إند + WhatsApp بالاختيار.',
    cover: 'kinbo-website/public/images/products/summer-set-light.png',
    assets: ['kinbo/new-phone-shots/generated/batch-12-downloads-summer/look-02-striped-swim-beach-flatlay-4x5-v1.png', 'kinbo/new-phone-shots/generated/batch-12-downloads-summer/look-03-asanerror-solid-shorts-beach-flatlay-4x5-v2.png', 'kinbo-website/public/images/products/summer-set-dark.png', 'kinbo-website/public/images/generated/cargo-shorts-lost-paradise-4x5.png'],
    notes: 'Slides 1–4 looks، واستخدم الكابشن كـchecklist للطلب. لا تضف سعر أو خامة غير مؤكدة.', channel: 'instagram',
  },
  {
    day: '22', time: '20:30', title: 'Lightweight Trousers — صورتين أوضح من كلام كتير',
    phase: 'Product education', goal: 'شرح بنطلون بدون ادعاء سعر أو خامة',
    hook: 'شوف البنطلون على الـrack وفي flat lay قبل ما تسأل.',
    format: 'Product carousel · 3 slides',
    platforms: 'Instagram Feed + Facebook',
    caption: 'Lightweight black trousers مع white/red horse tee. شوف اللوك والـflat lay، وبعدها ابعت المقاس على واتساب علشان نأكد المتاح. التوصيل داخل القاهرة والجيزة بس. #KINBO #بنطلون_رجالي #ستايل_صيفي',
    cta: 'Save + WhatsApp باسم LIGHTWEIGHT BLACK.',
    cover: 'kinbo-website/public/images/generated/lightweight-trousers-studio.png',
    assets: ['kinbo-website/public/images/generated/lightweight-trousers-studio.png', 'kinbo-website/public/images/generated/lightweight-trousers-flatlay.png', 'kinbo-website/public/images/products/year-of-horse-tee.png'],
    notes: 'Slide 1 studio. Slide 2 flat lay. Slide 3 tee family/CTA. ممنوع سعر أو ادعاء خامة غير موثق.', channel: 'instagram',
  },
  {
    day: '23', time: '21:00', title: 'KINBO — القاهرة والجيزة',
    phase: 'Local discovery', goal: 'ربط البراند بالموقع الجغرافي بوضوح',
    hook: 'في القاهرة أو الجيزة وبتدور على streetwear؟',
    format: 'Local discovery Reel · 7 sec · 9:16',
    platforms: 'Instagram Reels + Facebook Reels + TikTok',
    caption: 'لو إنت في القاهرة أو الجيزة وبتدور على streetwear، شوف اختيارات KINBO وابعتلنا Screenshot للقطعة مع المقاس واللون على واتساب. التوصيل حالياً داخل القاهرة والجيزة بس. #KINBO #ستريت_وير_مصر #ملابس_رجالي',
    cta: 'Follow + WhatsApp بالمنطقة والقطعة.',
    cover: 'kinbo-website/public/images/brand/showroom.jpg',
    assets: ['kinbo-website/public/images/brand/showroom.jpg', 'kinbo-website/public/images/brand/banner.jpg', 'KINBO_UPLOAD/2_COLOURWAY/staysharp_3colours.jpg', 'KINBO_UPLOAD/2_COLOURWAY/corex_4colours.jpg', 'KINBO_UPLOAD/2_COLOURWAY/shorts_4colours.jpg'],
    notes: 'ابدأ بواجهة المكان ثم banner ثم المنتجات. النص على الشاشة: CAIRO + GIZA ONLY. استخدم Cairo/Giza geotag. لا تذكر سرعة، مصاريف، COD أو نطاقات أصغر من غير تأكيد.', channel: 'tiktok',
  },
  {
    day: '24', time: '21:00', title: 'bull STOP ying — 3 ألوان',
    phase: 'Discovery', goal: 'استخراج Reel من صورة lineup واحدة',
    hook: 'نفس التصميم، 3 ألوان — كل لون له مود.',
    format: 'Color reveal Reel · 7 sec · 9:16',
    platforms: 'Instagram Reels + Facebook Reels + TikTok',
    caption: 'bull STOP ying بالـburgundy والـblue والـgreen. وقف الفيديو عند لونك وابعت Screenshot مع المقاس على واتساب علشان نأكد المتاح. التوصيل داخل القاهرة والجيزة بس. #KINBO #BullStop #تيشيرتات_رجالي',
    cta: 'Follow + Save + WhatsApp بصورة اللون.',
    cover: 'KINBO_UPLOAD/2_COLOURWAY/bullying_3colours.jpg',
    assets: ['KINBO_UPLOAD/2_COLOURWAY/bullying_3colours.jpg', 'kinbo-website/public/images/products/bullstop-tee.jpg'],
    notes: 'استخدم 3 crops من صورة الـcolourway ثم reveal كامل، واختم بصورة المنتج. ما تعتمدش على تصويت؛ الهدف إن المشاهد يحفظ أو يرسل Screenshot.', channel: 'tiktok',
  },
  {
    day: '25', time: '20:30', title: 'YEAR OF THE HORSE — تفاصيل اللوك',
    phase: 'Product education', goal: 'ربط التيشيرت بالبنطلون في Carousel واحد',
    hook: 'الأحمر هو اللي رابط اللوك كله.',
    format: 'Detail carousel · 5 slides',
    platforms: 'Instagram Feed + Facebook',
    caption: 'YEAR OF THE HORSE بالـwhite والـblack مع lightweight black trousers. احفظ اللوك وابعتلنا HORSE LOOK مع مقاسك على واتساب علشان نأكد المتاح. التوصيل داخل القاهرة والجيزة بس. #KINBO #YearOfTheHorse #ستايل_رجالي',
    cta: 'Save + WhatsApp باسم HORSE LOOK.',
    cover: 'kinbo-website/public/images/products/year-of-horse-tee.png',
    assets: ['kinbo-website/public/images/products/year-of-horse-tee.png', 'kinbo-website/public/images/generated/lightweight-trousers-studio.png', 'kinbo-website/public/images/generated/lightweight-trousers-flatlay.png'],
    notes: 'Slide 1 lineup. Slide 2 studio. Slide 3 flat lay. Slides 4–5 crops للتفاصيل وCTA. لا offer banner ولا سعر بنطلون.', channel: 'instagram',
  },
  {
    day: '26', time: '20:30', title: 'COREX بطريقتين',
    phase: 'Product education', goal: 'Carousel يربط المنتج المنفرد بالـfull fit',
    hook: 'شوف COREX لوحده وبعد ما يدخل في full fit.',
    format: 'Before/after carousel · 4 slides',
    platforms: 'Instagram Feed + Facebook',
    caption: 'COREX لوحده وبعدين في لوك كامل مع beige cargo. لف في الصور، واحفظ اختيارك، وابعت المقاس على واتساب علشان نأكد المتاح. التوصيل داخل القاهرة والجيزة بس. #KINBO #COREX #ستريت_وير_مصر',
    cta: 'Save + WhatsApp: COREX + size.',
    cover: 'kinbo-website/public/images/products/corex-tee.png',
    assets: ['kinbo-website/public/images/products/corex-tee.png', 'kinbo-website/public/images/generated/cargo-corex-beige-square.png', 'kinbo-website/public/images/generated/cargo-corex-beige-4x5.png', 'kinbo-website/public/images/generated/cargo-corex-beige-story.png'],
    notes: 'Slide 1 product. Slide 2 square full fit. Slide 3 4:5. Slide 4 CTA. لا تعرض نفس ratio مرتين بدون وظيفة مختلفة.', channel: 'instagram',
  },
  {
    day: '27', time: '21:15', title: 'Flat-Lay Looks على الرمل',
    phase: 'Discovery', goal: 'Reel سريع متعدد المنتجات يوضح أسلوب التصوير',
    hook: 'من غير مانيكان: اللوك كامل قدامك على الرمل.',
    format: 'Discovery Reel · 9 sec · 9:16',
    platforms: 'Instagram Reels + Facebook Reels + TikTok',
    caption: 'من غير مانيكان ولا دوشة: اللوك كامل قدامك على الرمل. اختار striped أو solid shorts، وابعت Screenshot مع المقاس واللون على واتساب. سعر الشورت بيتأكد وقت الطلب. التوصيل داخل القاهرة والجيزة بس. #KINBO #ستايل_صيفي #ملابس_رجالي',
    cta: 'Save + Follow + WhatsApp بالـScreenshot.',
    cover: 'kinbo/new-phone-shots/generated/batch-12-downloads-summer/look-02-striped-swim-beach-flatlay-4x5-v1.png',
    assets: ['kinbo/new-phone-shots/generated/batch-12-downloads-summer/look-02-striped-swim-beach-flatlay-4x5-v1.png', 'kinbo/new-phone-shots/generated/batch-12-downloads-summer/look-03-asanerror-solid-shorts-beach-flatlay-4x5-v2.png', 'kinbo-website/public/images/generated/cargo-shorts-lost-paradise-flatlay.png'],
    notes: 'اعمل slow top-down pan على كل flat-lay. لا تستخدم mannequin أو white-background frames. Ending: CAIRO + GIZA / WHATSAPP.', channel: 'tiktok',
  },
  {
    day: '28', time: '20:30', title: 'Linen Looks — الدليل الكامل',
    phase: 'Product education', goal: 'Carousel حفظ يوضح الـshirts والـset من زوايا مختلفة',
    hook: 'Linen shirts والـset من قدام ومن ورا وفي الألوان الظاهرة.',
    format: 'Product guide carousel · 4 slides',
    platforms: 'Instagram Feed + Facebook',
    caption: 'الـlinen shirts بالألوان الظاهرة، ومعاها الـset من قدام ومن ورا. احفظ الدليل وابعت Screenshot للقطعة واللون مع مقاسك على واتساب. التوصيل داخل القاهرة والجيزة بس. #KINBO #LinenLooks #ستايل_صيفي',
    cta: 'Save + WhatsApp بصورة اللون والمقاس.',
    cover: 'KINBO_UPLOAD/2_COLOURWAY/linen-shirts_3colours.jpg',
    assets: ['KINBO_UPLOAD/2_COLOURWAY/linen-shirts_3colours.jpg', 'kinbo-website/public/images/products/linen-set-front.png', 'kinbo-website/public/images/products/linen-set-back.png', 'kinbo-website/public/images/products/linen-set-colours.png'],
    notes: 'Slide 1 shirts. Slides 2–4 الـset. استخدم أسماء وصفية فقط ولا تدّعي تركيب خامة أو سعر غير مؤكد.', channel: 'instagram',
  },
  {
    day: '29', time: '21:30', title: 'Colourways في 7 ثواني',
    phase: 'Discovery', goal: 'اختبار hook ومنتجات مختلفة بلا اعتماد على المتابعين',
    hook: 'اختيارك التصميم ولا اللون؟ شوف التلاتة بسرعة.',
    format: 'Discovery Reel · 7 sec · 9:16',
    platforms: 'Instagram Reels + Facebook Reels + TikTok',
    caption: 'STAY SHARP وNEW CAST وbull STOP ying بأكتر من لون. وقف الفيديو عند اختيارك وابعت اسم التصميم واللون والمقاس على واتساب علشان نأكد المتاح. التوصيل داخل القاهرة والجيزة بس. #KINBO #تيشيرتات_رجالي #ستريت_وير_مصر',
    cta: 'Follow + Save + WhatsApp باسم التصميم.',
    cover: 'KINBO_UPLOAD/2_COLOURWAY/staysharp_3colours.jpg',
    assets: ['KINBO_UPLOAD/2_COLOURWAY/staysharp_3colours.jpg', 'KINBO_UPLOAD/1_TRY_ON/02_newcast_maroon.jpg', 'KINBO_UPLOAD/1_TRY_ON/03_newcast_green.jpg', 'KINBO_UPLOAD/2_COLOURWAY/bullying_3colours.jpg'],
    notes: 'Hook 0–1s، كل تصميم 2s، CTA آخر ثانية. استخدم audio native وقت النشر؛ لا تستخدم “اختار رقم” كهدف أساسي.', channel: 'tiktok',
  },
  {
    day: '30', time: '20:00', title: 'لو أول مرة تشوف KINBO — ابدأ هنا',
    phase: 'Conversion', goal: 'بوست مرجعي للقادمين الجدد من Reels',
    hook: 'وصلت جديد؟ دي أسرع جولة في KINBO.',
    format: 'Start-here carousel · 6 slides',
    platforms: 'Instagram Feed + Facebook',
    caption: 'لو أول مرة تشوف KINBO: عندنا graphic tees وsets وcargo وlightweight trousers. اختار القطعة وابعت المقاس واللون على واتساب علشان نأكد المتاح. التوصيل داخل القاهرة والجيزة بس. #KINBO #ستريت_وير_مصر #ملابس_رجالي',
    cta: 'Save + Visit profile + WhatsApp بصورة اللوك.',
    cover: 'kinbo-website/public/images/brand/showroom.jpg',
    assets: ['kinbo-website/public/images/brand/showroom.jpg', 'KINBO_UPLOAD/1_TRY_ON/01_stay-sharp_green.jpg', 'KINBO_UPLOAD/2_COLOURWAY/corex_4colours.jpg', 'KINBO_UPLOAD/1_TRY_ON/02_newcast_maroon.jpg', 'KINBO_UPLOAD/1_TRY_ON/04_crochet_olive.jpg', 'KINBO_UPLOAD/2_COLOURWAY/shorts_4colours.jpg', 'kinbo-website/public/images/generated/cargo-shorts-lost-paradise-4x5.png', 'KINBO_UPLOAD/2_COLOURWAY/linen-shirts_3colours.jpg'],
    notes: 'Slide 1 hook. Slides 2–5 categories. Slide 6 order/delivery. لا تدّعي best seller أو آراء عملاء قبل وجود بيانات حقيقية.', channel: 'instagram',
  },
  {
    day: '31', time: '21:00', title: 'August Launch Lookbook',
    phase: 'Conversion', goal: 'تجميع أقوى أصول الشهر في Lookbook قابل للحفظ',
    hook: 'أول Lookbook من KINBO — كل الستايلات في مكان واحد.',
    format: 'Lookbook carousel · 10 slides',
    platforms: 'Instagram Feed + Facebook · TikTok Photo Mode',
    caption: 'أول Lookbook من KINBO: beach flat-lays وgraphic tees وsets وcargo fits. احفظ اللوك اللي عجبك وابعت Screenshot مع المقاس على واتساب علشان نأكد المتاح. التوصيل داخل القاهرة والجيزة بس. #KINBO #KINBOLookbook #ستريت_وير_مصر',
    cta: 'Save + Follow لسبتمبر + WhatsApp بالـScreenshot.',
    cover: 'kinbo/new-phone-shots/generated/batch-12-downloads-summer/look-02-striped-swim-beach-flatlay-4x5-v1.png',
    assets: [
      'kinbo/new-phone-shots/generated/batch-12-downloads-summer/look-02-striped-swim-beach-flatlay-4x5-v1.png',
      'kinbo/new-phone-shots/generated/batch-12-downloads-summer/look-03-asanerror-solid-shorts-beach-flatlay-4x5-v2.png',
      'kinbo-website/public/images/generated/cargo-shorts-lost-paradise-4x5.png',
      'kinbo-website/public/images/generated/cargo-corex-beige-4x5.png',
      'kinbo-website/public/images/generated/cargo-bad-navy-4x5.png',
      'KINBO_UPLOAD/1_TRY_ON/01_stay-sharp_green.jpg',
      'KINBO_UPLOAD/1_TRY_ON/02_newcast_maroon.jpg',
      'KINBO_UPLOAD/1_TRY_ON/04_crochet_olive.jpg',
      'KINBO_UPLOAD/2_COLOURWAY/corex_4colours.jpg',
      'KINBO_UPLOAD/2_COLOURWAY/shorts_4colours.jpg',
      'KINBO_UPLOAD/3_BLACK_CAMO/03_camo_pair_green-tan+white.jpg',
      'KINBO_UPLOAD/2_COLOURWAY/linen-shirts_3colours.jpg',
    ],
    notes: '10 looks من غير title card زائد؛ أول صورة هي الغلاف. انشر Photo Mode على TikTok. بعد 72 ساعة راجع reach من non-followers، saves، profile visits وWhatsApp clicks لتخطيط سبتمبر.', channel: 'instagram',
  },
];

function scheduledAt(day: string, time: string) {
  return new Date(`2026-08-${day}T${time}:00+03:00`).toISOString();
}

function stableTitle(post: SeedPost) {
  return `KINBO · ${post.day}/08 · ${post.title}`;
}

function body(post: SeedPost) {
  return post.caption;
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
        status: 'draft',
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
    status: 'draft',
    scheduledAt: scheduledAt(post.day, post.time),
    imagePaths,
  });
  created++;
}

console.log(
  `KINBO calendar synced: ${created} created, ${updated} updated, ${skipped} already current, ${posts.length} total.`,
);
