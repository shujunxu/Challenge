
var sum = function (values) {
    if (!values.length) return 0;

    var total = 0;
    var count = 0;
    var value;

    for (var x = 0; x < values.length; x += 1) {
        value = parseFloat(values[x]);

        if (!isNaN(value)) {
            total += value;
            count++;
        }
    }

    return total;
};

var Sum = {
    aggregate: sum,
    merge: sum
};

module.exports = Sum;
