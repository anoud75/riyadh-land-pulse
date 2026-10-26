# ترقية الخريطة — Spatial Intelligence

## توحيد قائمة المساعد
- [x] حصر قائمة المساعد في المحادثات وتوحيد الأيقونات وتسمية المساعد الذكي.
- [x] التحقق من قائمة الفريق والمستثمر وفتح المحادثات.

## إجابات مساعد الفريق
- [x] اختصار وتنظيم الإجابات وتقييد الأدوات والعرض بالسؤال الحالي.
- [x] عرض المطابقة والاستبعاد بنتائج منظمة دون خرائط تلقائية أو بيانات سوق خارجية.
- [x] اختبار القواعد والتحقق من سؤال المطابقة داخل المحادثة.

## تحسين واجهات فريق سرج
- [x] ترتيب المحتوى وتقليل الفراغات في صفحات الفريق دون تغيير الحسابات.
- [x] تفاصيل فورية عند المرور على رسوم الطلب والركود والاستفسارات والأداء.
- [x] التحقق من الرسوم والتنقل وأحجام العرض.

- [x] src/lib/mapStats.ts — تجميع الأحياء (centroid/hull/median) + إحصاءات الشريط السفلي
- [x] src/lib/assistant.ts — محلل نية عربي حتمي (فلاتر + رد + ترشيح)
- [x] src/components/investor/MapAssistant.tsx — لوحة المحادثة اليسرى
- [x] src/components/investor/MapTicker.tsx — شريط المؤشرات السفلي
- [x] src/components/investor/ParcelMap.tsx — وضع الأحياء + تسميات المناطق + تحكم زوم مخصص
- [x] src/routes/investor.map.tsx — إعادة بناء الصفحة (فلاتر، لوحتان، شريط)
- [x] src/test/mapAssistant.test.ts — اختبارات المحلل والإحصاءات
- [x] تحقق بالمتصفح + لقطة شاشة

## شارات أسعار الأراضي
- [x] استبدال المربعات بشارات أسعار ونقاط تتكيف مع التقريب، وإبراز الموقع المحدد مع الحفاظ على الأحياء.
- [x] التحقق من الاختيار والتصفية والتقريب وعرض الأحياء بالمتصفح.
- [x] Site & living analysis in chat (business / living / commercial)
- [x] Investor map services toggle for nearby places

## Movable map workspace
- [x] Quiet light Mapbox canvas, price badges and location reticles (no invented boundaries).
- [x] Draggable/collapsible assistant, parcel details and filter controls.
- [x] Verify selection, dragging, filters, districts, assistant and narrow screens.

## مسار عرض الأرض
- [x] اختيار المستفسر ثم الأراضي ثم مراجعة العرض مع خرائط مصغرة.
- [x] فتح المستفسر المختار من صفحة الاستفسارات دون إعادة البحث.
- [x] التحقق من الاختيار والمراجعة والتسجيل وأحجام العرض.
