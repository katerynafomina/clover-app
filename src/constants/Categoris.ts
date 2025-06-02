type Category = {
    id: number;
    name: string;
    image: any; 
    subcategories: string[];
};

const categories: Category[] = [
    {
        id: 1,
        name: 'Головний убір',
        image: require('../assets/categories/hat.png'),
        subcategories: ["Кепки", "Шапки", "Панамки", "Берети", "Капелюхи"],
    },
    {
        id: 2,
        name: 'Куртки',
        image: require('../assets/categories/coat.png'),
        subcategories: ['Пуховики', 'Пальта', 'Джинсовки', 'Вітровки', 'Тренчі']
    },
    {
        id: 3,
        name: 'Піджаки',
        image: require('../assets/categories/suit.png'),
        subcategories: ['Піджаки']
    },
    {
        id: 4,
        name: 'Светри',
        image: require('../assets/categories/sweater.png'),
        subcategories: ['Світшоти', 'Кардигани | Зіп-сверти', 'Худі', "Водолазки"]
    },
    {
        id: 5,
        name: 'Жилетки',
        image: require('../assets/categories/gilet.png'),
        subcategories: ['Жилетки']
    },
    {
        id: 6,
        name: 'Сорочки',
        image: require('../assets/categories/shirt.png'),
        subcategories: ['Сорочки']
    },
    {
        id: 7,
        name: 'Футболки',
        image: require('../assets/categories/t-shirt.png'),
        subcategories: ['Футболки', 'Топи', 'Майки']
    },
    {
        id: 8,
        name: 'Плаття',
        image: require('../assets/categories/dress.png'),
        subcategories: ['Плаття']
    },
    {
        id: 9,
        name: 'Штани',
        image: require('../assets/categories/pants.png'),
        subcategories: ['Штани']
    },
    {
        id: 10,
        name: 'Спідниці',
        image: require('../assets/categories/skirt.png'),
        subcategories: ['Спідниці']
    },
    {
        id: 11,
        name: 'Шорти',
        image: require('../assets/categories/shorts.png'),
        subcategories: ['Шорти']
    },
    {
        id: 12,
        name: 'Взуття',
        image: require('../assets/categories/shoes.png'),
        subcategories: ['Кросівки/Кеди', 'Підбори', 'Черевики', 'Босоніжки' ]
    },
];

export { categories, Category };
