export type Categories = {
    hat: string[];
    coat: string[];
    middle: string[];
    buttom: string[];
    shoes: string[];
};

export default function getCategoriesByTemperature(temperature: number): Categories {
    if (temperature < 10) {
        return {
            hat: ["Шапки", "Панамки"],
            coat: ["Пуховики", "Пальта"],
            middle: ["Світшоти", "Худі"],
            buttom: ["Штани"],
            shoes: ["Черевики"]
        };
    } else if (temperature < 15) {
        return {
            hat: ["Шапки", "Панамки", "Берети"],
            coat: ["Тренчі", "Пальта", "Демісезонні куртки"],
            middle: ["Світшоти", "Худі"],
            buttom: ["Штани"],
            shoes: ["Кросівки/Кеди"]
        };
    } else if (temperature < 20) {
        return {
            hat: ["Кепки", "Панамки", "Берети"],
            coat: ["Джинсовки", "Вітровки", "Тренчі", "Піджаки", "Кардигани"],
            middle: ["Сорочки", "Світшоти", "Худі", "Водолазки"],
            buttom: ["Штани"],
            shoes: ["Кросівки/Кеди"]
        };
    } else if (temperature < 25) {
        return {
            hat: ["Кепки", "Панамки"],
            coat: ["Вітровки", "Піджаки", "Кардигани", "Сорочки"],
            middle: ["Футболки", "Топи", "Майки", "Літні плаття"],
            buttom: ["Шорти", "Штани", "Спідниці"],
            shoes: ["Кросівки/Кеди", "Босоніжки", "Підбори"]
        };
    } else {
        return {
            hat: ["Кепки", "Панамки", "Капелюхи"],
            middle: ["Сорочки"],
            buttom: ["Футболки", "Топи", "Майки", "Літні плаття", "Спідниці"],
            coat: ["Шорти", "Спідниці"],
            shoes: ["Кросівки/Кеди", "Босоніжки"]
        };
    }
}