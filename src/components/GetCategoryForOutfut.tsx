type Categories = { [key: string]: (string | null)[] };
type Result = { [key: string]: string | null };
type Feedback = { [key: string]: number };

function softmax(values: number[]): number[] {
  const max = Math.max(...values);
  const exps = values.map(v => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(exp => exp / sum);
}

function weightedRandomChoice<T>(items: T[], weights: number[]): T {
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    acc += weights[i];
    if (r < acc) return items[i];
  }
  return items[items.length - 1];
}

export default function filterAndSelectCategories(
  categories: Categories,
  subcategories: string[],
  feedback?: Feedback
): Result {
  const filteredCategories: Categories = {};
  Object.keys(categories).forEach((key) => {
    for (const value of categories[key]) {
      if (subcategories.includes(value!) || value === null) {
        if (!filteredCategories[key]) filteredCategories[key] = [];
        filteredCategories[key].push(value);
      }
    }
  });

  const result: Result = {};
  Object.keys(filteredCategories).forEach((key) => {
    const values = filteredCategories[key];
    if (!values.length) {
      result[key] = null;
      return;
    }

    if (feedback) {
      const weights = values.map(val => (val ? feedback[val] ?? 0 : 0));
      const probs = softmax(weights);
      result[key] = weightedRandomChoice(values, probs);
    } else {
      const randomIndex = Math.floor(Math.random() * values.length);
      result[key] = values[randomIndex];
    }
  });

  if (result.middle === 'Плаття') {
    result.buttom = null;
  }

  return result;
}
