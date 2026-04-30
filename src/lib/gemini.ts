import { GoogleGenAI } from '@google/genai';
import { Meal, DishEvaluation } from '../types';
import * as xlsx from 'xlsx';

export const analyzeMenuDocument = async (
  file: File,
  apiKey: string,
  onProgress?: (msg: string) => void
): Promise<Meal[]> => {
  if (!apiKey) {
    throw new Error('API Key is missing');
  }

  onProgress?.('جاري معالجة الملف...');
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    أنت خبير في الإطعام الجماعي والمقاصف.
    يحتوي الملف المرفق على قوائم الوجبات (Menus) بالإضافة إلى جدول/قوائم تفصل المقادير والكميات المخصصة لكل فرد (Quantities per person). 
    مهمتك هي دمج هذه المعلومات واستخراج الوجبات مع مكوناتها وكمياتها الدقيقة للفرد الواحد.
    قم باستخراج البيانات وتنسيقها كـ JSON بالشكل التالي بدقة (يجب أن يكون الناتج JSON فقط بدون أي نصوص أخرى):
    {
      "meals": [
        {
          "day": "monday|tuesday|wednesday|thursday|friday|saturday|sunday (اختياري)",
          "type": "breakfast|lunch|dinner|suhoor|iftar",
          "name": "اسم الوجبة (مثلاً: الفطور، الغداء، العشاء)",
          "ingredients": [
            {
              "name": "اسم المادة بدقة (مثال: شاي، زيت زيتون، لحم بقر)",
              "quantityPerPerson": رقم (الكمية الدقيقة للفرد الواحد المذكورة في الوثيقة رقماً. مثلاً 125، 10، 1.5. لا تدع هذا الحقل فارغاً أو 0 إذا كان مذكوراً في الملف),
              "unit": "الوحدة (مثال: غ، كغ، لتر، مل، حبة، وحدة)"
            }
          ]
        }
      ]
    }
    ملاحظات هامة:
    - ابحث بدقة عن الكميات المخصصة لكل فرد في كامل الوثيقة واربطها بالمكونات المُناسبة في الوجبات.
    - قم بتوحيد الوحدات (مثلاً اجعل الغرام هو الأساس للأوزان الصغيرة "غ").
    - حافظ على أسماء المواد كما هي.
    - نوع الوجبة (type) يجب أن يكون فقط: "breakfast", "lunch", "dinner", "suhoor", "iftar".
    - اليوم (day) استنتجه من اسم اليوم في القائمة.
    - تأكد من أن quantityPerPerson رقم صالح وليس نصاً.
  `;

  const parseResponseText = (text: string): Meal[] => {
    const jsonResponse = JSON.parse(text);
    return jsonResponse.meals.map((meal: any) => ({
      id: Math.random().toString(36).substring(2, 9),
      day: meal.day || 'monday',
      type: meal.type || 'lunch',
      name: meal.name || 'وجبة',
      ingredients: (meal.ingredients || []).map((ing: any) => ({
        id: Math.random().toString(36).substring(2, 9),
        name: ing.name || 'مادة مرجعية',
        quantityPerPerson: Number(ing.quantityPerPerson) || 0,
        unit: ing.unit || 'حبة'
      }))
    }));
  };

  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();

  const isExcel = name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv') || type.includes('excel') || type.includes('spreadsheetml') || type.includes('csv');

  if (isExcel) {
    onProgress?.('جاري قراءة محتوى دفتر الإكسيل...');
    const buffer = await file.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: 'array' });
    
    let excelText = '';
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = xlsx.utils.sheet_to_csv(sheet);
      excelText += `\n--- ورقة: ${sheetName} ---\n${csv}\n`;
    }

    onProgress?.('جاري تحليل المحتوى باستخدام الذكاء الاصطناعي...');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt + "\n\n" + excelText,
      config: { responseMimeType: "application/json" }
    });

    const text = response.text;
    if (!text) throw new Error("لم يتم إرجاع أي نص من النموذج.");
    return parseResponseText(text);
  } else {
    const supportedTypes = ['application/pdf', 'text/plain', 'text/csv', 'text/html', 'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];
    if (!supportedTypes.includes(type) && !type.startsWith('image/')) {
       throw new Error(`نوع الملف غير مدعوم للمعالجة المباشرة (${type || name}). يرجى رفع ملف إكسيل، PDF، أو صورة.`);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          onProgress?.('جاري تحليل المحتوى باستخدام الذكاء الاصطناعي...');
          
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
              prompt,
              {
                inlineData: {
                  data: base64Data,
                  mimeType: file.type
                }
              }
            ],
            config: {
              responseMimeType: "application/json",
            }
          });

          const text = response.text;
          if(!text) throw new Error("لم يتم إرجاع أي نص من النموذج.");
          
          resolve(parseResponseText(text));
        } catch (error) {
          console.error('Gemini Analysis Error:', error);
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
    });
  }
};

export const analyzeDishImage = async (
  file: File,
  referenceMeal: Meal | null,
  apiKey: string,
  onProgress?: (msg: string) => void
): Promise<DishEvaluation> => {
  if (!apiKey) throw new Error('API Key is missing');

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        
        onProgress?.('جاري تحليل الصورة باستخدام الذكاء الاصطناعي...');
        
        const ai = new GoogleGenAI({ apiKey });
        
        let prompt = `
          أنت خبير تغذية وطباخ محترف في الإطعام الجماعي.
          قم بتحليل صورة هذا الطبق واستخرج المكونات التي تراها بالعين المجردة مع تقدير كمياتها بالنسبة لفرد واحد.
        `;

        if (referenceMeal) {
          prompt += `
          وقارن الطبق المصور مع قائمة المقادير المخصصة لهذه الوجبة:
          اسم الوجبة: ${referenceMeal.name}
          المقادير المبرمجة للفرد:
          ${referenceMeal.ingredients.map(ing => `- ${ing.name}: ${ing.quantityPerPerson} ${ing.unit}`).join('\n')}
          
          قم بتقييم ما إذا كان الطبق في الصورة يطابق أو ينقص أو يزيد عن المقادير المبرمجة. هل هناك مكونات مفقودة؟ هل الكمية تبدو وفق المعايير؟
          `;
        }

        prompt += `
          قم بصياغة إجابتك كـ JSON بالشكل التالي:
          {
            "detectedIngredients": ["مكون 1 مع الكمية التقديرية", "مكون 2..."],
            "evaluation": "نص التقييم والمقارنة مع الوجبة المرجعية (إن وجدت)، مع ذكر النواقص والملاحظات حول جودة وكمية التقديم بصيغة احترافية.",
            "score": رقم من 1 إلى 10 يمثل مدى التطابق والوفرة والجودة
          }
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            prompt,
            {
              inlineData: {
                data: base64Data,
                mimeType: file.type
              }
            }
          ],
          config: {
            responseMimeType: "application/json",
          }
        });

        const text = response.text;
        if(!text) throw new Error("لم يتم إرجاع أي نص من النموذج.");
        
        const jsonResponse = JSON.parse(text);
        resolve(jsonResponse as DishEvaluation);
      } catch (error) {
        console.error('Gemini Dish Analysis Error:', error);
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
  });
};
