var pricingSource = require('./list.js');
module.export = proteusMW.module('pricingSource.service', [])
    .sisList(
    /*proteusGenerate*/
    {
        service: 'PricingSourceService',
        url: 'api/portfolio/GetPricingSources'
    }, {
        mapper: 'Model.Id=id',
        filter: 'pricingSource'
    })
    .sisGetById({
        role: 'proteus.api',
        action: 'getById',
        entity: 'PricingSource',
        url: 'api/portfolio/GetPricingSources'
    })
    .mapper('pricingSource', {
        get: ['Model.Id', 'Model.Name'],
        set: ['id', 'name']
    })
    .filter('pricingSource', function () {
        return function (a, b, c, d) {
            return true;
        };
    })
    .name;

function unop(a, b, c, d) {
    try {
        return a + b + c + d;
    } catch (error) {
        return;
    }
}
function op(a, b, c, d) {
    return a + b + c + d;
}

