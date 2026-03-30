ai directory

## translate

`ai/translate` contains a Redis batch that scans `geoapify:places:tourism.sights:city:*`,
adds missing `properties.name_international.ko` and `properties.description_ko`,
and writes the updated Geoapify JSON back to the same keys.

The batch uses LangChain with Ollama `translategemma:4b` and keeps Redis scanning
sequential while parallelizing translation calls with a small thread pool.

Redis connection settings are independent from `data/geoapify` and use:
`TRANSLATE_REDIS_HOST`, `TRANSLATE_REDIS_PORT`, `TRANSLATE_REDIS_DB`,
and `TRANSLATE_REDIS_PASSWORD`.
