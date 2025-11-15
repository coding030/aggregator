import { configureStore } from "@reduxjs/toolkit"
import tokenReducer from "./reducers/tokenSlice"
import providerReducer from "./reducers/providerSlice"
import quoteReducer from "./reducers/quoteSlice"
import swapReducer from "./reducers/swapSlice"

export const store = configureStore({
  reducer: {
    token: tokenReducer,
    provider: providerReducer,
    quote: quoteReducer,
    swap: swapReducer,
  },
  middleware: gdm => gdm({ serializableCheck: false })
})
