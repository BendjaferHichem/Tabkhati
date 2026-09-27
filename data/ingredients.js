// data/ingredients.js
// قائمة المكونات الأساسية. name = معرف داخلي (slug إنجليزي) يُستخدم للربط بالوصفات.
// category تطابق أقسام "ماذا في ثلاجتك": veg, meat, dairy_egg, grain, canned, staple

module.exports = [
  // خضروات
  { name: 'potato', arabic_name: 'بطاطس', emoji: '🥔', category: 'veg' },
  { name: 'tomato', arabic_name: 'طماطم', emoji: '🍅', category: 'veg' },
  { name: 'onion', arabic_name: 'بصل', emoji: '🧅', category: 'veg' },
  { name: 'garlic', arabic_name: 'ثوم', emoji: '🧄', category: 'veg' },
  { name: 'carrot', arabic_name: 'جزر', emoji: '🥕', category: 'veg' },
  { name: 'pepper_veg', arabic_name: 'فلفل', emoji: '🫑', category: 'veg' },
  { name: 'cucumber', arabic_name: 'خيار', emoji: '🥒', category: 'veg' },
  { name: 'zucchini', arabic_name: 'كوسا', emoji: '🥒', category: 'veg' },
  { name: 'eggplant', arabic_name: 'باذنجان', emoji: '🍆', category: 'veg' },
  { name: 'spinach', arabic_name: 'سبانخ', emoji: '🥬', category: 'veg' },
  { name: 'lettuce', arabic_name: 'خس', emoji: '🥬' , category: 'veg' },
  { name: 'lemon', arabic_name: 'ليمون', emoji: '🍋', category: 'veg' },
  { name: 'parsley', arabic_name: 'بقدونس', emoji: '🌿', category: 'veg' },
  { name: 'mushroom', arabic_name: 'فطر', emoji: '🍄', category: 'veg' },

  // لحوم وبروتين
  { name: 'chicken', arabic_name: 'دجاج', emoji: '🍗', category: 'meat' },
  { name: 'beef', arabic_name: 'لحم بقري', emoji: '🥩', category: 'meat' },
  { name: 'ground_meat', arabic_name: 'لحم مفروم', emoji: '🥩', category: 'meat' },
  { name: 'tuna', arabic_name: 'تونة', emoji: '🐟', category: 'meat' },
  { name: 'shrimp', arabic_name: 'روبيان', emoji: '🦐', category: 'meat' },
  { name: 'sausage', arabic_name: 'نقانق', emoji: '🌭', category: 'meat' },

  // ألبان وبيض
  { name: 'egg', arabic_name: 'بيض', emoji: '🥚', category: 'dairy_egg' },
  { name: 'cheese', arabic_name: 'جبن', emoji: '🧀', category: 'dairy_egg' },
  { name: 'mozzarella', arabic_name: 'جبن موتزاريلا', emoji: '🧀', category: 'dairy_egg' },
  { name: 'milk', arabic_name: 'حليب', emoji: '🥛', category: 'dairy_egg' },
  { name: 'yogurt', arabic_name: 'زبادي', emoji: '🥣', category: 'dairy_egg' },
  { name: 'butter', arabic_name: 'زبدة', emoji: '🧈', category: 'dairy_egg' },
  { name: 'cream', arabic_name: 'قشدة', emoji: '🥛', category: 'dairy_egg' },

  // حبوب ونشويات
  { name: 'rice', arabic_name: 'أرز', emoji: '🍚', category: 'grain' },
  { name: 'pasta', arabic_name: 'مكرونة', emoji: '🍝', category: 'grain' },
  { name: 'bread', arabic_name: 'خبز', emoji: '🍞', category: 'grain' },
  { name: 'flour', arabic_name: 'طحين', emoji: '🌾', category: 'grain' },
  { name: 'lentils', arabic_name: 'عدس', emoji: '🟠', category: 'grain' },
  { name: 'couscous', arabic_name: 'كسكس', emoji: '🍚', category: 'grain' },
  { name: 'potato_starch', arabic_name: 'نشا', emoji: '🌾', category: 'grain' },
  { name: 'tortilla', arabic_name: 'خبز تورتيلا', emoji: '🌯', category: 'grain' },

  // معلبات
  { name: 'canned_tomato', arabic_name: 'طماطم معلبة', emoji: '🥫', category: 'canned' },
  { name: 'canned_tuna', arabic_name: 'تونة معلبة', emoji: '🥫', category: 'canned' },
  { name: 'chickpeas', arabic_name: 'حمص', emoji: '🥫', category: 'canned' },
  { name: 'olives', arabic_name: 'زيتون', emoji: '🫒', category: 'canned' },
  { name: 'corn', arabic_name: 'ذرة', emoji: '🌽', category: 'canned' },
  { name: 'beans', arabic_name: 'فاصوليا', emoji: '🫘', category: 'canned' },

  // أساسيات (لا تُنقص التطابق كثيراً - غالباً متوفرة)
  { name: 'salt', arabic_name: 'ملح', emoji: '🧂', category: 'staple', is_staple: 1 },
  { name: 'black_pepper', arabic_name: 'فلفل أسود', emoji: '🧂', category: 'staple', is_staple: 1 },
  { name: 'oil', arabic_name: 'زيت', emoji: '🫒', category: 'staple', is_staple: 1 },
  { name: 'olive_oil', arabic_name: 'زيت زيتون', emoji: '🫒', category: 'staple', is_staple: 1 },
  { name: 'sugar', arabic_name: 'سكر', emoji: '🧂', category: 'staple', is_staple: 1 },
  { name: 'cumin', arabic_name: 'كمون', emoji: '🧂', category: 'staple', is_staple: 1 },
  { name: 'paprika', arabic_name: 'بابريكا', emoji: '🧂', category: 'staple', is_staple: 1 },
  { name: 'vinegar', arabic_name: 'خل', emoji: '🧂', category: 'staple', is_staple: 1 },
  { name: 'mayonnaise', arabic_name: 'مايونيز', emoji: '🧂', category: 'staple', is_staple: 0 },
  { name: 'ketchup', arabic_name: 'كاتشب', emoji: '🧂', category: 'staple', is_staple: 0 },
  { name: 'baking_powder', arabic_name: 'بيكنج باودر', emoji: '🧂', category: 'staple', is_staple: 1 },
  { name: 'tahini', arabic_name: 'طحينة', emoji: '🧂', category: 'staple', is_staple: 0 },
];
