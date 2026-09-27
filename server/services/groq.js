// server/services/groq.js
// طبقة الذكاء الاصطناعي: تستخدم Groq API (متوافقة مع واجهة OpenAI) لشرح
// النتائج التي اختارتها خوارزمية المطابقة الحتمية بلغة عربية طبيعية.
// مهم جداً: الذكاء الاصطناعي لا يخترع وصفات أو مكونات، بل يشرح فقط
// الوصفات المُرسلة إليه من قاعدة البيانات المُتحقق منها.

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

function buildSystemPrompt() {
  return `أنت مساعد طبخ عربي ودود اسمه "طبختي". مهمتك الوحيدة هي شرح توصيات
وصفات تم اختيارها مسبقاً من قاعدة بيانات موثوقة، وليس اختراع وصفات جديدة.

قواعد صارمة يجب اتباعها دائماً:
1. اختر من بين الوصفات المُعطاة فقط فيما يخص "recipeId" — لا تخترع أرقام وصفات غير موجودة.
2. لا تخترع مكونات أو خطوات تحضير تتعارض مع الوصفة المُعطاة.
3. اكتب بلغة عربية طبيعية وودودة، وليست رسمية أو مترجمة حرفياً.
4. اجعل الشرح مختصراً ومفيداً (جملة أو جملتين لكل وصفة).
5. اقترح بدائل معقولة فقط إذا كانت منطقية فعلاً (مثال: استبدال الزبادي بالقشدة).
6. أعد الناتج بصيغة JSON فقط، دون أي نص إضافي قبله أو بعده، وبدون علامات Markdown.

صيغة الناتج المطلوبة (JSON فقط):
{
  "recommendations": [
    {
      "recipeId": <رقم الوصفة>,
      "reason": "<سبب موجز يشرح لماذا تناسب هذه الوصفة المستخدم>",
      "substitutions": ["<اقتراح استبدال إن وجد>"],
      "extraNote": "<ملاحظة إضافية اختيارية أو نص فارغ>"
    }
  ]
}`;
}

function buildUserPrompt({ userIngredients, timeAvailable, preferences, candidateRecipes }) {
  const recipesForPrompt = candidateRecipes.map((c) => ({
    recipeId: c.recipe.id,
    name: c.recipe.arabic_name,
    matchScore: c.matchScore,
    totalTime: c.recipe.total_time,
    difficulty: c.recipe.difficulty,
    missingIngredients: c.missing.map((m) => m.arabic_name),
    requiredIngredients: c.recipe.ingredients.filter((i) => !i.is_optional).map((i) => i.arabic_name),
  }));

  return `مكونات المستخدم المتوفرة: ${userIngredients.join('، ') || 'لا شيء محدد'}
الوقت المتاح: ${timeAvailable ? timeAvailable + ' دقيقة' : 'غير محدد'}
التفضيلات: ${preferences.length ? preferences.join('، ') : 'لا يوجد'}

الوصفات المرشحة من قاعدة البيانات (بالترتيب حسب نسبة التطابق):
${JSON.stringify(recipesForPrompt, null, 2)}

اشرح لماذا تناسب كل وصفة هذا المستخدم تحديداً، بالاعتماد فقط على البيانات أعلاه.`;
}

/**
 * يستدعي Groq API لشرح الوصفات المرشحة. يعيد null عند أي فشل (مفتاح مفقود،
 * خطأ شبكة، استجابة غير صالحة...) بحيث يستمر الموقع بالعمل بدون الذكاء الاصطناعي.
 */
async function explainRecommendations({ userIngredients, timeAvailable, preferences, candidateRecipes }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn('GROQ_API_KEY غير مُعرّف — سيتم عرض النتائج بدون شرح الذكاء الاصطناعي.');
    return null;
  }
  if (!candidateRecipes || candidateRecipes.length === 0) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.4,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          {
            role: 'user',
            content: buildUserPrompt({ userIngredients, timeAvailable, preferences, candidateRecipes }),
          },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error('Groq API error:', response.status, await response.text().catch(() => ''));
      return null;
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return null;

    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!parsed || !Array.isArray(parsed.recommendations)) return null;

    // تحقق أمني إضافي: تجاهل أي recipeId لا يظهر ضمن الوصفات المرشحة أصلاً
    const validIds = new Set(candidateRecipes.map((c) => c.recipe.id));
    parsed.recommendations = parsed.recommendations.filter((r) => validIds.has(r.recipeId));

    return parsed;
  } catch (err) {
    console.error('تعذّر الاتصال بمساعد الذكاء الاصطناعي (Groq):', err.message);
    return null;
  }
}

module.exports = { explainRecommendations };
