type Category = {
    id: number;
    name: string;
    image: any; // Можете вказати точніший тип для зображення, якщо потрібно
};

const categories: Category[] = [
    {
        id: 1,
        name: 'Плаття',
        image: require('../assets/categories/dress.png')
    },
    {
        id: 2,
        name: 'Штани',
        image: require('../assets/categories/pants.png')
    },
    {
        id: 3,
        name: 'Сорочки',
        image: require('../assets/categories/shirt.png')
    },
    {

        id: 4,
        name: 'Футболки',
        image: require('../assets/categories/t-shirt.png')
    },
    {
        id: 5,
        name: 'Взуття',
        image: require('../assets/categories/shoes.png')
    },
    {
        id: 6,
        name: 'Спідниці',
        image: require('../assets/categories/skirt.png')
    },
    {
        id: 7,
        name: 'Шорти',
        image: require('../assets/categories/shorts.png')
    },
    {
        id: 8,
        name: 'Светри',
        image: require('../assets/categories/sweater.png')
    },
    {
        id: 9,
        name: 'Куртки',
        image: require('../assets/categories/coat.png')
    },
    {
        id: 10,
        name: 'Майки',
        image: require('../assets/categories/camisole.png')
    },
    {
        id: 11,
        name: 'Топи',
        image: require('../assets/categories/top.png')
    },
    {
        id: 12,
        name: 'Жилетки',
        image: require('../assets/categories/gilet.png')
    },
    {
        id: 13,
        name: 'Головний убір',
        image: require('../assets/categories/hat.png')
    },
    {
        id: 14,
        name: 'Піджаки',
        image: require('../assets/categories/suit.png')
    }
];

export { categories, Category };
