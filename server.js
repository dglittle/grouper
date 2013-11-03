
var _ = require('gl519')
require('./server_utils.js')

_.run(function () {
    defaultEnv("PORT", 5000)
    defaultEnv("NODE_ENV", "production")
    defaultEnv("MONGOHQ_URL", "mongodb://localhost:27017/grouper")
    defaultEnv("SESSION_SECRET", "super_secret")

    var db = require('mongojs')(process.env.MONGOHQ_URL)
    var express = require('express')
    var app = express()
    var rpc_version = 1
    var rpc = {}

    rpc.grab = function (arg, req) {

        return dbEval(db, function () {
            return 'hi: ' + db.records.find().count()
        })

        return dbEval(db, function () {
            function getSequence(first, n) {
                return db.records.find({
                    _id : { $gte : first._id }
                }).sort({ _id : 1}).limit(n).toArray()
            }

            var firstN = 10 + Math.floor(Math.random() * 10)
            var secondN = 30 - firstN

            db.records.ensureIndex({ answerCount : 1, random : 1 }, { background : true })
            var xs = getSequence(db.records.find({}).sort({ answerCount : 1, random : 1 }).limit(1).toArray()[0], firstN)

            db.records.ensureIndex({ random : 1 }, { background : true })
            function getRandom(filter, sort) {
                var first = db.records.find({ random : filter }).sort(sort).limit(1).toArray()[0]
                return first && getSequence(first, secondN)
            }
            var r = Math.random()
            xs = xs.concat(getRandom({ $gte : r }, { random : 1}) || getRandom({ $lte : r }, { random : -1 }))

            for (var i = 0; i < xs.length; i++) {
                var x = xs[i]
                db.records.update({ _id : x._id }, {
                    $inc : { answerCount : 0.0001 }
                })
            }

            return xs
        })
    }

    rpc.getResult = function (arg, req) {
        return dbEval(db, function (arg) {
            return db.results.find({}).skip(arg).toArray()[0]
        }, arg)
    }

    rpc.submit = function (arg, req) {
        return dbEval(db, function (arg, user) {
            db.results.insert({
                user : user,
                result : arg
            })
        }, arg, req.user)
    }

    createServer(express, app, db,
        process.env.PORT, process.env.SESSION_SECRET,
        rpc_version, rpc)

})
