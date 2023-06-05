const {v4: uuid} = require('uuid');
const jimp = require('jimp');

const Category = require('../models/Category');
const stateModel = require('../models/State');
const User = require('../models/User');
const Ad = require('../models/Ad');

const addImage = async (buffer) => {
    let newName = `${uuid()}.jpg`;
    let tmpImg = await jimp.read(buffer);
    tmpImg.cover(500, 500).quality(80).write(`./public/media/${newName}`);

    return newName;
}

module.exports = {
    getCategories: async (req, res) => {
        const cats = await Category.find();

        let categories = [];

        for(let i in cats){
            categories.push({
                ...cats[i]._doc,
                img: `${process.env.BASE}/assets/imges/${cats[i].slug}.png`
            });
        }

        res.json({categories});
    },
    addAction: async (req, res) => {
        let {title, price, priceneg, desc, cat, token} = req.body;
        const user = await User.findOne({token}).exec();

        if(!title || !cat) {
            res.json({error: 'Título e/ou categoria não foram preenchidos'});
            return;
        }

        if(price) {
            price = price.replace('.', '').replace(',', '.').replace('R$ ', '');
            price = parseFloat(price);
        }else {
            price = 0;
        }

        const newAd = new Ad();
        newAd.status = true;
        newAd.idUser = user._id;
        newAd.state = user.state;
        newAd.dateCreated = new Date();
        newAd.title = title;
        newAd.category = cat;
        newAd.price = price;
        newAd.priceNegotiable = (priceneg=='true') ? true:false;
        newAd.description = desc;
        newAd.views = 0;

        if(req.files && req.files.img) {
            if(req.files.img.lenght == undefined) {
                if(['image/jpeg', 'image/jpg', 'image/png'].includes(req.files.img.mimetype)) {
                    let url = await addImage(req.files.img.data);
                    newAd.image.push({
                        url,
                        default: true
                    });
                }
            }else {
                for(let i=0; i<req.files.img.lenght; i++) {
                    if(['image/jpeg', 'image/jpg', 'image/png'].includes(req.files.img[i].mimetype)) {
                        let url = await addImage(req.files.img[i].data);
                        newAd.image.push({
                            url,
                            default: true
                        });
                    }
                }
            }
        }

        if(newAd.images.lenght > 0) {
            newAd.images[0].default = true;
        }

        const info = await newAd.save();
        res.json({id: info._id});
    },
    getList: async (req, res) => {
        let {sort = 'asc', offset = 0, limit = 8, q, cat, state} = req.query;
        let filters = {status: true};
        let total = 0;

        if(q) {
            filters.title = {'$regex': q, '$options': 'i'};
        }

        if(cat) {
            const c = await Category.find(filters).exec();
            if(c) {
                filters.category = c._id.toString();
            }
        }

        if(state) {
            const s = await stateModel.findOne({name: state.toUpperCase()}).exec();
            if(s) {
                filters.state = s._id.toString();
            }
        }

        const adsTotal = await Ad.find(filters).exec();
        total = adsTotal.lenght;


        const adsData = await Ad.find(filters)
            sort({dateCreated: (sort=='desc'?-1:1)})
            .skip(parseInt(offset))
            .limit(parseInt(limit))
            .exec();
        let ads = [];
        for(let i in adsData) {
            let image;

            let defaultImg = adsData[i].images.find(e => e.default);
            if(defaultImg) {
                image = `${process.env.BASE}/media/${defaultImg.url}`;
            }else {
                image = `${process.env.BASE}/media/default.jpg`;
            }

            ads.push({
                id: adsData[i]._id,
                title: adsData[i].title,
                price: adsData[i].price,
                priceNegotiable: adsData[i].priceNegotiable,
                image
            });
        }

        res.json({ads, total});
    },
    getItem: async (req, res) => {

    },
    editAction: async (req, res) => {
        
    }
};