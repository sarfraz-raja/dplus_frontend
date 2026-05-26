import { configureStore } from "@reduxjs/toolkit";
import auth from "./reducers/auth-reducer"
import customQuery from "./reducers/customQuery-reducer"
import powerBI from "./reducers/powerBI-reducer"
import component from "./reducers/component-reducer"
import alertConfiguration from "./reducers/alertConfiguration-reducer"
import isonForm from "./reducers/isonForm-reducer"
import adminManagement from "./reducers/adminManagement-reducer"
import nokiaPrePost from "./reducers/nokiaPrePost-reducer"
import websocket from "./reducers/websocket-reducer"
import map from "./reducers/map-reducer"
import cxix from "./reducers/cxix-reducer"
import insightsEngine from "./reducers/insightsEngine-reducer"

const store = configureStore({
    reducer: {
        auth,
        customQuery,
        powerBI,
        component,
        alertConfiguration,
        isonForm,
        adminManagement,
        nokiaPrePost,
        websocket,
        map,
        cxix,
        insightsEngine,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredPaths: [
                    "map.rawCells",
                    "map.rawSites",
                    "map.rawCellsPerMap",
                    "map.planNeighbourLines",
                    "map.driveTestData",
                    "map.rfPredictionGeoJson",
                    "map.boundaryGeoJson",
                ],
            },
        }),
    devTools: true
})


export default store