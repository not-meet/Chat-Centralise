import dotenv from 'dotenv'
dotenv.config()

export const config = {
    server: {
        port: process.env.SERVER_PORT || 3001,
    },
    maytapi: {
        productId: process.env.MAYTAPI_PRODUCT_ID,
        apiToken: process.env.MAYTAPI_API_TOKEN,
    },
}
