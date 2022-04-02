//this is used to wrap async functions
//it will limit the use of try/catch blocks because 
//the more routes there are, the more try/catch blocks will be used

const asyncWrapper = (func) => {
    return async(req, res, next) => {
        try{
            await func(req, res, next)
        }catch (error){
            next(error)
        }
    }
}

module.exports = asyncWrapper