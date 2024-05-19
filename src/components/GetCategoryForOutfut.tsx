type Categories = { [key: string]: string[] };
type Result = { [key: string]: string | null };

export default function filterAndRandomizeCategories(categories: Categories, subcategories: string[]): Result {
    // Фільтруємо категорії за наявністю підкатегорій в масиві subcategories
    const filteredCategories: Categories = {};
    Object.keys(categories).forEach((key) => {
        for (const value of categories[key]) {
            if (subcategories.includes(value)) {
                if (!filteredCategories[key]) {
                    filteredCategories[key] = [];
                }
                filteredCategories[key].push(value);
            }
        }
        // filteredCategories[key] = categories[key].filter(subcategory => subcategories.includes(subcategory));
    });

    // Вибираємо рандомну підкатегорію для кожного типу одягу
    const result: Result = {};
    Object.keys(filteredCategories).forEach((key) => {
        const category = filteredCategories[key];
        const randomIndex = Math.floor(Math.random() * category.length);
        result[key] = category[randomIndex] || null;
    });

    // Умовне видалення нижньої частини одягу, якщо обрані сукні
    if (result.middle === 'Літні плаття' || result.middle === 'Демісезонні плаття') {
        result.buttom = null;
    }

    return result;
}
