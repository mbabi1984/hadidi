export const defaultProgram = [
  { id:'upper-a', name:'علوي A', english:'UPPER A', day:6, focus:'الصدر والظهر والذراع', exercises:[
    {id:'chest_press',ar:'ضغط صدر',en:'Chest Press',sets:3,min:8,max:12},
    {id:'pec_fly',ar:'فراشة الصدر (جهاز)',en:'Pec Fly Machine',sets:3,min:10,max:15},
    {id:'lat_pulldown',ar:'سحب علوي',en:'Lat Pulldown',sets:3,min:8,max:12},
    {id:'seated_row',ar:'سحب جالس ضيق',en:'Seated Row',sets:2,min:10,max:12},
    {id:'lateral_raise',ar:'رفرفة جانبية كيبل',en:'Cable Lateral Raise',sets:3,min:12,max:20},
    {id:'face_pull',ar:'فيس بول',en:'Face Pull',sets:2,min:12,max:15},
    {id:'triceps_machine',ar:'ترايسبس جهاز',en:'Triceps Machine',sets:2,min:10,max:15},
    {id:'biceps_machine',ar:'بايسبس كيرل جهاز',en:'Biceps Curl Machine',sets:2,min:10,max:15,tip:'وزن المرجع القديم كان من تمرين كيبل، فلا يُنقل تلقائيًا إلى هذا الجهاز الجديد.'},
  ]},
  { id:'lower-a', name:'سفلي A', english:'LOWER A', day:0, focus:'الفخذ الأمامي والخلفي والسمانة', exercises:[
    {id:'leg_press',ar:'دفع الأرجل',en:'Leg Press',sets:3,min:10,max:12},
    {id:'leg_extension',ar:'تمديد الفخذ',en:'Leg Extension',sets:3,min:10,max:15},
    {id:'leg_curl',ar:'ثني الفخذ الخلفي',en:'Seated Leg Curl',sets:4,min:10,max:12},
    {id:'hip_adductor',ar:'ضم الفخذ',en:'Hip Adductor',sets:2,min:12,max:15},
    {id:'standing_calf',ar:'رفع السمانة واقف',en:'Standing Calf Raise',sets:3,min:12,max:15},
    {id:'ab_crunch_machine',ar:'كرنش البطن (جهاز)',en:'Abdominal Crunch Machine',sets:3,min:10,max:15,tip:'اعمل بثني البطن دون سحب الحركة من الورك، وتحكم بالعودة. إذا ظهر ألم أسفل الظهر أو تنميل، توقف.'},
    {id:'wrist_curl',ar:'ثني الرسغ للساعد (دامبل)',en:'Dumbbell Wrist Curl',sets:2,min:12,max:20,weightMultiplier:2,tip:'حافظ على ثبات الساعد وحرك الرسغ بهدوء. سجّل وزن الدمبل الواحد، ولا تُقارن بالكيبل أو بجهاز مختلف.'}
  ]},
  { id:'upper-b', name:'علوي B', english:'UPPER B', day:2, focus:'الصدر المائل والظهر والأكتاف', exercises:[
    {id:'incline_press',ar:'ضغط صدر مائل',en:'Incline Chest Press',sets:3,min:8,max:12},
    {id:'chest_supported_row',ar:'سحب بدعم الصدر',en:'Chest-Supported Row',sets:3,min:8,max:12},
    {id:'shoulder_press',ar:'ضغط كتف جهاز',en:'Shoulder Press Machine',sets:2,min:8,max:12,tip:'آخر وزن مرجعي 19 كغ. ابدأ بوزن مريح وقبضة مناسبة؛ أوقف الحركة إذا زاد ألم مقدمة الكتف أو استمر بعد التمرين.'},
    {id:'pec_fly',ar:'فراشة الصدر (جهاز)',en:'Pec Fly Machine',sets:2,min:12,max:15},
    {id:'straight_arm',ar:'سحب ذراع مستقيم',en:'Straight-Arm Pulldown',sets:2,min:12,max:15},
    {id:'reverse_pec',ar:'رفرفة خلفية جهاز',en:'Reverse Pec Deck',sets:2,min:12,max:20},
    {id:'lateral_raise',ar:'رفرفة جانبية كيبل',en:'Cable Lateral Raise',sets:2,min:12,max:20},
    {id:'hammer_dumbbell',ar:'هامر كيرل دامبل',en:'Dumbbell Hammer Curl',sets:2,min:10,max:15,weightMultiplier:2,tip:'سجّل وزن الدمبل الواحد لكل يد. الحجم التدريبي يُحسب لليدين معًا. لا تستخدم مرجع وزن الهامر كيبل السابق.'},
    {id:'triceps_overhead',ar:'تمديد ترايسبس فوق الرأس كيبل',en:'Overhead Cable Triceps Extension',sets:2,min:10,max:15,tip:'استخدم حبل الكيبل وتحكم في الحركة. خفّف الوزن أو غيّر التمرين عند أي ألم بالكتف.'},
  ]},
  { id:'lower-b', name:'سفلي B', english:'LOWER B', day:4, focus:'الخلفية والجلوت والفخذ منفرد', exercises:[
    {id:'leg_curl',ar:'ثني الفخذ الخلفي',en:'Leg Curl Machine',sets:4,min:10,max:15},
    {id:'glute_machine',ar:'جهاز الجلوت',en:'Glute Machine',sets:3,min:10,max:12},
    {id:'single_leg_right',ar:'ضغط رجل واحدة — يمين',en:'Single-Leg Press (Right)',sets:3,min:10,max:12},
    {id:'single_leg_left',ar:'ضغط رجل واحدة — يسار',en:'Single-Leg Press (Left)',sets:3,min:10,max:12},
    {id:'hip_abductor',ar:'فتح الفخذ',en:'Hip Abductor',sets:2,min:12,max:15},
    {id:'seated_calf',ar:'سمانة جالس',en:'Seated Calf Raise',sets:3,min:12,max:15},
    {id:'pallof_press',ar:'ضغط بالوف للكور',en:'Cable Pallof Press',sets:2,min:10,max:12,tip:'10–12 عدة لكل جهة. حافظ على ظهر محايد وتنفس بشكل طبيعي، وسجل وزن الكيبل.'},
    {id:'reverse_wrist_curl',ar:'بسط الرسغ العكسي للساعد (دامبل)',en:'Dumbbell Reverse Wrist Curl',sets:2,min:12,max:20,weightMultiplier:2,tip:'راحة اليد للأسفل، ساعدك ثابت، ومدى حركة مريح. ابدأ بوزن خفيف وسجّل وزن الدمبل الواحد.'}
  ]}
];

// Actual previous observations are references, not invented completed sessions.
// The date and machine remain visible to avoid comparing different equipment.
export const references = {
  chest_press:{date:'2026-11-03', entries:[[45,12],[45,10],[45,8]]},
  shoulder_press:{date:'2026-11-03', entries:[[19,9],[19,10]]},
  pec_fly:{date:'2026-11-03', entries:[[52,12],[52,11],[52,11]]},
  lat_pulldown:{date:'2026-11-04', entries:[[59,11],[59,10],[59,9]]},
  seated_row:{date:'2026-11-04', entries:[[59,12],[59,12],[59,12]]},
  lateral_raise:{date:'2026-11-03', entries:[[33,20],[33,18],[33,18]]},
  face_pull:{date:'2026-11-04', entries:[[17,15],[17,15],[17,15]]},
  biceps_curl:{date:'2026-11-04', entries:[[23,10],[23,8]]},
  incline_press:{date:'2026-11-03', entries:[[40,9],[40,9],[40,9]]},
  chest_supported_row:{date:'2026-11-04', entries:[[54.3,12],[54.3,11],[54.3,10]]},
  straight_arm:{date:'2026-11-04', entries:[[30,10],[27.5,11],[27.5,11]]},
  hammer_curl:{date:'2026-11-04', entries:[[20,11],[20,9],[20,8]]},
  leg_press:{date:'2026-11-05', entries:[[93,12],[93,12],[93,11]]},
  leg_extension:{date:'2026-11-05', entries:[[59,12],[59,10],[59,10]]},
  leg_curl:{date:'2026-11-05', entries:[[59,13],[59,12],[59,11]]},
  hip_adductor:{date:'2026-11-05', entries:[[59,15],[59,12]]},
  hip_abductor:{date:'2026-11-05', entries:[[59,15],[59,12]]},
  glute_machine:{date:'2026-11-05', entries:[[80,12],[80,10],[80,8]]}
};
export const weekdays = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
