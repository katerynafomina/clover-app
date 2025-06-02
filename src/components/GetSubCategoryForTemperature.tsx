type Categories = {
  hat: (string | null)[];
  coat: (string | null)[];
  middle: string[];
  buttom: string[];
  shoes: string[];
};

type WeatherTag = "rainy" | "windy" | "sunny";

export default function getCategoriesByTemperature(
  temperature: number,
  weatherTags: WeatherTag[] = []
): { categories: Categories; takeUmbrella: string } {
  let categories: Categories;
  let takeUmbrella = "No";

  if (temperature < -5) {
    categories = {
      hat: ["Шапки"],
      coat: ["Пуховики"],
      middle: ["Світшоти", "Худі"],
      buttom: ["Штани"],
      shoes: ["Черевики"],
    };
  } else if (temperature < 10) {
    categories = {
      hat: ["Шапки", "Панамки"],
      coat: ["Пуховики", "Пальта"],
      middle: ["Світшоти", "Худі"],
      buttom: ["Штани"],
      shoes: ["Черевики"],
    };
  } else if (temperature < 15) {
    categories = {
      hat: ["Шапки", "Панамки", "Берети"],
      coat: ["Тренчі", "Пальта", "Демісезонні куртки"],
      middle: ["Світшоти", "Худі"],
      buttom: ["Штани"],
      shoes: ["Кросівки/Кеди", "Черевики"],
    };
  } else if (temperature < 20) {
    categories = {
      hat: ["Кепки", "Панамки", "Берети", null],
      coat: ["Джинсовки", "Вітровки", "Тренчі", "Піджаки", "Кардигани"],
      middle: ["Сорочки", "Світшоти", "Худі", "Водолазки"],
      buttom: ["Штани"],
      shoes: ["Кросівки/Кеди"],
    };
  } else if (temperature < 25) {
    categories = {
      hat: ["Кепки", "Панамки", null],
      coat: ["Вітровки", "Піджаки", "Кардигани", "Сорочки"],
      middle: ["Футболки", "Топи", "Майки", "Плаття"],
      buttom: ["Шорти", "Штани", "Спідниці"],
      shoes: ["Кросівки/Кеди", "Босоніжки", "Підбори"],
    };
  } else {
    categories = {
      hat: ["Кепки", "Панамки", "Капелюхи", null],
      coat: ["Сорочки", null],
      middle: ["Футболки", "Топи", "Майки", "Плаття", "Спідниці"],
      buttom: ["Шорти", "Спідниці"],
      shoes: ["Кросівки/Кеди", "Босоніжки"],
    };
  }

  if (weatherTags.includes("rainy")) {
    takeUmbrella = "Yes";
    categories.shoes = categories.shoes.filter(sh => sh !== "Босоніжки" && sh !== "Підбори");
    if (!categories.coat?.includes("Вітровки")) {
      categories.coat?.push("Вітровки");
    }
  }
    if (weatherTags.includes("sunny") && temperature >= 25) {
        takeUmbrella = "Maybe";
    }
  if (weatherTags.includes("windy")) {
    if (!categories.coat?.includes("Вітровки")) {
      categories.coat?.push("Вітровки");
    }
  }

  return { categories, takeUmbrella };
}
    