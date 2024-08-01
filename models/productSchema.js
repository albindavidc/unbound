const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
 
    product_name:{
        type:String,
        require:true,
    },
    oldPrice:{
        type:Number,
        require:true,
    },
    price:{
        type:Number,
        require:true,
    },
    description:{
        type:String,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true,
    },
    isActive:{
        type:Boolean,
        default:true
    },
    stock:{
        type:Number,
        min:0,
        requires:true,
        default:0
    },
    Colour:{
        type:String,   
    },
    displaySize:{
        type: Number,
        require:true,
    },
    resolution:{
        type: String,
        require:true,
    },
    Processor:{
        type: String,
        require:true,
    },
    ramSize:{
        type:  Number,
        require:true,
    },
    hardDriveSize:{
        type: Number,
        require:true,
    },
    hardDiskDescription:{
        type: String,
        require:true,
    },
    graphicsChipsetBrand:{
        type: String,
        require:true,
    }, 
    operatingSystem:{
        type: String,
        require:true,
    },
    numberofUSB:{
        type:  Number,
        require:true,
    },
    audioDetails:{
        type: String,
        require:true,
    },
    countryofOrigin:{
        type: String,
        require:true,
    },
    itemWeight:{
        type:  String,
        require:true,
    },
    reviews: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Review',
        },
    ],
    primaryImages:[
        {
            name:{
                type:String,
            },
            path:{
                type:String
            }
        }
    ],
    secondaryImages:[
        {
            name:{
                type:String,
            },
            path:{
                type:String
            }
        }
    ],
    
},
{
    timestamps: true,
    strict: false,
  },
)
module.exports = mongoose.model("Product", productSchema);