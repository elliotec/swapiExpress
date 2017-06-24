const express = require('express');
const fetch = require('node-fetch');
const app = express();
const swapi = 'http://swapi.co/api';

app.set('view engine', 'ejs');

app.get('/', function (req, res) {
    res.render('index', {heading: 'Hello Grow!'});
});

app.get('/character/:name', function (req, res) {
    const url = `${swapi}/people/?search=${req.params.name}`;

    fetch(url)
        .then(res => res.json())
        .then(json => renderCharacterView(json));

    function renderCharacterView(json){
        const character = json.results[0];
        res.render('character', {
            name: character.name,
            height: character.height,
            eye_color: character.eye_color,
            birth_year: character.birth_year,
            hair_color: character.hair_color,
            gender: character.gender,
            homeworld: character.homeworld
        });
    }
});

app.get('/characters', function (req, res) {
    let mappedCharacters = [];
    const sortValue = req.query.sort ? req.query.sort : '';

    const allPages = [1,2,3,4,5].map((page) => getAllCharacters(page)
        .then(json => mapResults(json))
    );


    function mapResults(json){
        mappedCharacters.push(json);
        return mappedCharacters;
    }

    function reducePages(pages){
        const reduced = pages.reduce((acc, curr) =>
            acc.concat(curr), []
        );

        const set = Array.from(new Set(reduced));

        return set.reduce((acc, curr) =>
            acc.concat(curr), []
        );
    }

    function getAllCharacters(pageNum){
        let url = `${swapi}/people/?page=${pageNum}`;

        return fetch(url)
            .then(res => res.json())
            .then(json => json.results);
    }


    function maybeSortCharacters(allPages, sortValue) {
        const reducedPages = reducePages(allPages);

        if (sortValue) {
            return reducedPages.sort((a, b) => {
                const aString = a[sortValue].toUpperCase();
                const bString = b[sortValue].toUpperCase();

                if (aString < bString) {
                    return -1;
                }
                if (aString > bString) {
                    return 1;
                }

                return 0;
            });
        } else {
            return reducedPages;
        }
    }

    Promise.all(allPages).then(pages => {
        const allOrSortedCharacters = maybeSortCharacters(pages, sortValue);

        res.send(allOrSortedCharacters);
    });
});

app.get('/planetresidents', function (req, res) {
    const url = `${swapi}/planets/`;

    function mapResidentsToPlanets(json) {
        const planets = json.results;
        return Promise.all(planets.map(planet => {
            return getResidents(planet).then(residents => {
                return { [planet.name] : residents };
            });
        }));
    }

    function getResidents(planet) {
        const residentsUrls = planet.residents;
        return Promise.all(residentsUrls.map(url =>
            fetch(url)
                .then(res => res.json())
                .then(resident => resident.name)
            )
        );
    }

    function buildPlanetsResidentsObject(array){
        return array.reduce((object, item) => {
            return Object.assign(object, item);
        }, {});
    }

    fetch(url)
        .then(res => res.json())
        .then(json => mapResidentsToPlanets(json))
        .then(array => buildPlanetsResidentsObject(array))
        .then(result => res.send(result));

});

app.listen(3000, () => {
    console.log('express app listening at localhost:3000');
});

