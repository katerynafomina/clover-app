export default function getCategoriesByTemperature(temperature: number) {
    if (temperature < 10) {
        return [
            { name: 'Головний убір', subcategories: ["Шапки", "Панамки", "Берети"] },
            { name: 'Куртки', subcategories: ["Пуховики", "Пальта"] },
            { name: 'Светри', subcategories: ["Піджаки", "Кардигани | Зіп-сверти", "Жилетки"] },
            { name: 'Сорочки', subcategories: ["Сорочки"] },
            { name: 'Футболки', subcategories: ["Світшоти"] },
            { name: 'Плаття', subcategories: ["Водолазки"] },
            { name: 'Штани', subcategories: ["Штани"] },
            { name: 'Взуття', subcategories: ["Черевики"] }
        ];
    } else if (temperature < 15) {
        return [
            { name: 'Головний убір', subcategories: ["Кепки", "Панамки", "Берети"] },
            { name: 'Куртки', subcategories: ["Джинсовки", "Вітровки"] },
            { name: 'Светри', subcategories: ["Піджаки", "Кардигани | Зіп-сверти", "Жилетки"] },
            { name: 'Сорочки', subcategories: ["Сорочки"] },
            { name: 'Футболки', subcategories: ["Світшоти"] },
            { name: 'Плаття', subcategories: ["Демісезонні плаття"] },
            { name: 'Штани', subcategories: ["Штани"] },
            { name: 'Взуття', subcategories: ["Кросівки/Кеди"] }
        ];
    } else if (temperature < 20) {
        return [
            { name: 'Головний убір', subcategories: ["Кепки", "Панамки", "Берети"] },
            { name: 'Куртки', subcategories: ["Джинсовки", "Вітровки", "Тренчі"] },
            { name: 'Светри', subcategories: ["Піджаки", "Кардигани | Зіп-сверти", "Жилетки"] },
            { name: 'Сорочки', subcategories: ["Сорочки"] },
            { name: 'Футболки', subcategories: ["Світшоти", "Топи", "Майки"] },
            { name: 'Плаття', subcategories: ["Демісезонні плаття"] },
            { name: 'Штани', subcategories: ["Штани"] },
            { name: 'Взуття', subcategories: ["Кросівки/Кеди"] }
        ];
    } else if (temperature < 25) {
        return [
            { name: 'Головний убір', subcategories: ["Кепки", "Панамки"] },
            { name: 'Куртки', subcategories: ["Вітровки", "Піджаки"] },
            { name: 'Светри', subcategories: ["Кардигани | Зіп-сверти"] },
            { name: 'Сорочки', subcategories: ["Сорочки"] },
            { name: 'Футболки', subcategories: ["Футболки", "Топи", "Майки"] },
            { name: 'Плаття', subcategories: ["Літні плаття", "Спідниці"] },
            { name: 'Штани', subcategories: ["Шорти", "Штани"] },
            { name: 'Взуття', subcategories: ["Кросівки/Кеди", "Босоніжки"] }
        ];
    } else {
        return [
            { hat: 'Головний убір', subcategories: ["Кепки", "Панамки", "Капелюхи"] },
            { middle: 'Сорочки', subcategories: ["Сорочки"] },
            { buttom: 'Футболки', subcategories: ["Футболки", "Топи", "Майки"] },
            { shoes: 'Плаття', subcategories: ["Літні плаття", "Спідниці"] },
            { coat: 'Штани', subcategories: ["Шорти", "Штани"] },
            { name: 'Взуття', subcategories: ["Кросівки/Кеди", "Босоніжки"] }
        ];
    }
}