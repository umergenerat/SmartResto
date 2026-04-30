export type DayOfWeek = 
  | 'monday' 
  | 'tuesday' 
  | 'wednesday' 
  | 'thursday' 
  | 'friday' 
  | 'saturday' 
  | 'sunday';

export type MealType = 
  | 'breakfast' 
  | 'lunch' 
  | 'dinner' 
  | 'suhoor' 
  | 'iftar';

export type ScheduleMode = 'normal' | 'ramadan';

export interface ReferenceIngredient {
  id: string;
  name: string;
  nameFr?: string;
  quantityPerPerson: number;
  unit: string;
}

export interface Ingredient {
  id: string;
  name: string;
  nameFr?: string;
  quantityPerPerson: number;
  unit: string;
}

export interface Meal {
  id: string;
  day?: DayOfWeek;
  type: MealType;
  name: string;
  ingredients: Ingredient[];
}

export interface Beneficiaries {
  fullBoard: number;
  halfBoard: number; // Lunch / Iftar only
}

export interface TotalsResult {
  name: string;
  nameFr?: string;
  unit: string;
  totalQuantity: number;
  mealsUsing: string[];
}

/** نتيجة مفصّلة: مادة × وجبة × يوم */
export interface DetailedResult {
  mealId: string;
  mealName: string;
  day: DayOfWeek;
  mealType: MealType;
  ingredientName: string;
  ingredientNameFr?: string;
  unit: string;
  quantityPerPerson: number;
  peopleCount: number;
  totalQuantity: number;
}

export interface DishEvaluation {
  detectedIngredients: string[];
  evaluation: string;
  score: number;
}

export interface ApiSettings {
  apiKey: string;
  useOpenModel: boolean;
}
