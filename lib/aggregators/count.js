var Sum = require('./sum');

var Count = {
    aggregate: function (values) {
        if (Array.isArray(values)) {
            return values.length;
        } else {
            return 0;
        }
    },

    merge: Sum.merge
};

module.exports = Count;
