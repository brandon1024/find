var encodedEntities = {
    9:['Tab'],10:['NewLine'],32:[],33:['excl'],34:['quot', 'QUOT'],35:['num'],36:['dollar'], 37:['percnt'],38:['amp', 'AMP'],39:['apos'],
    40:['lpar'],41:['rpar'],42:['ast','midast'],43:['plus'],44:['comma'],45:['period'],46:['sol'],47:[],48:[],49:[],50:[],
    51:[],52:[],53:[],54:[],55:[],56:[],57:[],58:['colon'],59:['semi'],60:['lt', 'LT'],61:['equals'],62:['gt', 'GT'],63:['quest'],
    64:['commat'],65:[],66:[],67:[],68:[],69:[],70:[],71:[],72:[],73:[],74:[],75:[],76:[],77:[],78:[],79:[],80:[],81:[],
    82:[],83:[],84:[],85:[],86:[],87:[],88:[],89:[],90:[],91:['lsqb','lbrack'],92:['bsol'],93:['rsqb','rbrack'],94:['Hat'],
    95:['lowbar'],96:['grave','DiacritialGrave'],97:[],98:[],99:[],100:[],101:[],102:[],103:[],104:[],105:[],106:[],107:[],
    108:[],109:[],110:[],111:[],112:[],113:[],114:[],115:[],116:[],117:[],118:[],119:[],120:[],121:[],122:[],123:['lcub','lbrace'],
    124:['verbar','vert','VerticalLine'],125:['rcub','rbrace'],126:['tilde','DiacriticalTilde'],160:['nbsp','NonBreakingSpace']
};

var decodedEntities = {
    9:['Tab'],10:['NewLine'],34:['quot', 'QUOT'],38:['amp', 'AMP'],39:['apos'],60:['lt', 'LT'],62:['gt', 'GT'],160:['nbsp','NonBreakingSpace']
};

//Replace ASCII HTML character entities with their actual character representation
function decode(string) {
    var regex = /&(#[xX]?)?.*?;/g;

    string = string.replace(regex, function(regexMatch) {
        var strippedMatch = regexMatch.replace(/[&;]/g, '');

        if(strippedMatch.charAt(0) == '#') {
            strippedMatch = strippedMatch.replace(/#/, '');

            var charCode;
            if(strippedMatch.charAt(0).toLowerCase() == 'x')
                charCode = parseInt('0' + strippedMatch);
            else
                charCode = parseInt(strippedMatch);

            if(encodedEntities[charCode])
                return String.fromCharCode(charCode);
        }
        else {
            for(var key in encodedEntities) {
                for(var index = 0; index < encodedEntities[key].length; index++) {
                    if(encodedEntities[key][index] == strippedMatch)
                        return String.fromCharCode(key);
                }
            }
        }

        return regexMatch;
    });

    return string;
}

//Encode characters described above into HTML safe text
function encode(string) {
    for(var index = 0; index < string.length; index++) {
        var charCode = string.charCodeAt(index);
        if(!decodedEntities[charCode])
            continue;

        var encodedEntity = '&' + decodedEntities[charCode][0] + ';';
        string = string.substring(0, index) + encodedEntity + string.substring(index + 1);
    }

    return string;
}