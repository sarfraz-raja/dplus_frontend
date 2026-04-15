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
    },
    devTools: true
})


export default store