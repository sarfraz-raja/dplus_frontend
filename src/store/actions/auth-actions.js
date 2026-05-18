import Api from "../../utils/api"
import { Urls } from "../../utils/url"
import {
    SET_AUTHENTICATED,
    SET_COMMON_CONFIG,
    SET_PERMISSION,
    SET_SIDEBAR_MENU,
    SET_TOKEN,
    SET_USER,
} from "../reducers/auth-reducer"
import CommonActions from "./common-actions"
import { isReadOnlyFrontendMode } from "../../utils/url"

/** Single user-facing message for login failures (no raw API dump in UI). */
const loginErrorMessage = (res) => {
    if (!res || res.status == null) {
        return "Unable to reach the server. Check your connection and try again."
    }
    const raw =
        res?.data?.msg ??
        res?.data?.message ??
        res?.data?.error ??
        (typeof res?.data === "string" ? res.data : null)
    if (raw && String(raw).trim()) return String(raw).trim()
    const s = res.status
    if (s === 400 || s === 401) return "Invalid username or password."
    if (s === 403) return "Access denied."
    if (s === 429) return "Too many attempts. Please try again later."
    if (s >= 500) return "Server error. Please try again later."
    return "Sign-in failed. Please try again."
}

/** Load role-based menu + profile fields from Flask `GET /me` (see dplus-apis.postman_collection). */
const fetchMe = () => async (dispatch) => {
    try {
        if (!localStorage.getItem("token")) {
            dispatch(SET_SIDEBAR_MENU(null))
            return { ok: false }
        }
        const res = await Api.get({ url: Urls.me, inst: 0 })
        if (res?.status !== 200 || !res?.data) {
            dispatch(SET_SIDEBAR_MENU(null))
            return { ok: false }
        }

        const { menu, user: meUser } = res.data
        if (Array.isArray(menu) && menu.length > 0) {
            dispatch(SET_SIDEBAR_MENU(menu))
        } else {
            dispatch(SET_SIDEBAR_MENU(null))
        }

        if (meUser && typeof meUser === "object") {
            try {
                const raw = localStorage.getItem("user")
                const u = raw ? JSON.parse(raw) : {}
                const merged = { ...u, ...meUser }
                localStorage.setItem("user", JSON.stringify(merged))
                dispatch(SET_USER(merged))
            } catch {
                /* ignore */
            }
        }
        return { ok: true }
    } catch {
        dispatch(SET_SIDEBAR_MENU(null))
        return { ok: false }
    }
}

/** Fetch user profile from backend — GET /profile */
const fetchProfile = () => async (dispatch) => {
    try {
        if (!localStorage.getItem("token")) {
            return { ok: false, profile: null }
        }
        const res = await Api.get({ url: Urls.profile, inst: 0 })
        if (res?.status !== 200 || !res?.data) {
            if (import.meta.env.DEV) console.warn("[auth] fetchProfile no data", res?.status)
            return { ok: false, profile: null }
        }
        
        // Handle different response structures — backend may nest data differently
        let profileData = res.data
        if (profileData?.data && typeof profileData.data === "object") {
            profileData = profileData.data
        }
        
        if (!profileData || typeof profileData !== "object") {
            if (import.meta.env.DEV) console.warn("[auth] fetchProfile invalid data structure", profileData)
            return { ok: false, profile: null }
        }
        
        // Map backend fields to frontend format
        // Backend sends: firstName, lastName, fullName, role, avatar, email, phone, username, id, createTime, updateTime
        const firstName = profileData.firstName || profileData.firstname || ""
        const lastName = profileData.lastName || profileData.lastname || ""
        const fullName = profileData.fullName || `${firstName} ${lastName}`.trim() || "User"
        const role = profileData.role || profileData.rolename || "User"
        
        const mapped = {
            id: profileData.id || profileData.userId,
            firstName: firstName,
            lastName: lastName,
            firstname: firstName, // For compatibility
            lastname: lastName,   // For compatibility
            fullName: fullName,
            name: fullName,
            username: profileData.username || "",
            email: profileData.email || "",
            phone: profileData.phone || "",
            avatar: profileData.avatar && profileData.avatar !== 'null' ? profileData.avatar : "",
            role: role,
            rolename: role,      // For compatibility
            title: role,         // For compatibility
            createTime: profileData.createTime,
            updateTime: profileData.updateTime,
        }
        
        if (import.meta.env.DEV) console.log("[auth] fetchProfile mapped:", mapped)
        
        // Update localStorage and Redux
        try {
            const existing = JSON.parse(localStorage.getItem("user") || "{}")
            const merged = { ...existing, ...mapped }
            localStorage.setItem("user", JSON.stringify(merged))
            dispatch(SET_USER(merged))
        } catch (e) {
            if (import.meta.env.DEV) console.warn("[auth] fetchProfile localStorage error", e?.message)
            localStorage.setItem("user", JSON.stringify(mapped))
            dispatch(SET_USER(mapped))
        }
        
        return { ok: true, profile: mapped }
    } catch (error) {
        if (import.meta.env.DEV) console.warn("[auth] fetchProfile error", error?.message)
        return { ok: false, profile: null }
    }
}

/** Update profile fields via PATCH /profile */
const updateProfile = (profileData) => async (dispatch) => {
    if (isReadOnlyFrontendMode || !localStorage.getItem("token")) {
        return { ok: false, serverSynced: false }
    }
    
    try {
        // Extract first and last names from fullName if not provided separately
        let firstName = profileData?.firstName || profileData?.firstname || ""
        let lastName = profileData?.lastName || profileData?.lastname || ""
        
        if (!firstName && !lastName && profileData?.fullName) {
            const parts = profileData.fullName.trim().split(/\s+/)
            firstName = parts[0] || ""
            lastName = parts.slice(1).join(" ") || ""
        }
        
        // Send to backend using lowercase field names (as per backend expectations)
        const body = {
            firstname: firstName,
            lastname: lastName,
            username: profileData?.username,
            email: profileData?.email,
            phone: profileData?.phone,
            avatar: profileData?.avatar === "" ? "" : profileData?.avatar,
        }

        // Include password fields only when the user wants to change their password
        const currentPwd = profileData?.currentpassword || profileData?.currentPassword
        const newPwd = profileData?.newpassword || profileData?.newPassword
        if (currentPwd || newPwd) {
            body.currentpassword = currentPwd
            body.newpassword = newPwd
        }

        if (import.meta.env.DEV) console.log("[auth] updateProfile sending:", body)

        const res = await Api.patch({ url: Urls.profile, data: body, inst: 0 })
        if (res?.status >= 200 && res?.status < 300) {
            await dispatch(fetchProfile())
            window.dispatchEvent(new Event("dy3-profile-updated"))
            return { ok: true, serverSynced: true, data: res.data }
        }
        if (import.meta.env.DEV) console.warn("[auth] updateProfile failed:", res?.status, res?.data)
        return { ok: false, serverSynced: false, status: res?.status, message: res?.data?.msg }
    } catch (error) {
        if (import.meta.env.DEV) console.warn("[auth] updateProfile error", error?.message)
        return { ok: false, serverSynced: false }
    }
}

/** Upload avatar file via POST /upload-avatar (FormData) */
const uploadAvatar = (file) => async (dispatch) => {
    if (isReadOnlyFrontendMode || !localStorage.getItem("token")) {
        return { ok: false, avatar: null }
    }
    
    try {
        const formData = new FormData()
        formData.append("file", file)
        
        const res = await Api.upload({ url: Urls.uploadAvatar, data: formData, inst: 1 })
        if (res?.status >= 200 && res?.status < 300) {
            const avatarUrl = res.data?.avatar
            
            // Update localStorage with new avatar
            try {
                const existing = JSON.parse(localStorage.getItem("user") || "{}")
                const updated = { ...existing, avatar: avatarUrl }
                localStorage.setItem("user", JSON.stringify(updated))
                dispatch(SET_USER(updated))
            } catch {
                /* ignore */
            }
            
            // Trigger sync event
            window.dispatchEvent(new Event("dy3-profile-updated"))
            return { ok: true, avatar: avatarUrl }
        }
        return { ok: false, avatar: null }
    } catch (error) {
        if (import.meta.env.DEV) console.warn("[auth] uploadAvatar", error?.message)
        return { ok: false, avatar: null }
    }
}

// Action to remove avatar
export const removeAvatar = () => async (dispatch, getState) => {
    try {
        const response = await api.post(Urls.removeAvatar);
        if (response.status === 200) {
            const currentUser = getState().auth.user;
            const updatedUser = { ...currentUser, avatar: "" };

            // Update Redux
            dispatch({ type: "auth/SET_USER", payload: updatedUser });
            // Update LocalStorage
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            return { success: true };
        }
    } catch (error) {
        console.error("Remove avatar failed", error);
        return { success: false };
    }
};

/** Large base64 avatars can exceed gateway limits — skip in PATCH, still kept in localStorage from Profile. */
const MAX_AVATAR_PATCH_LENGTH = 80_000

/**
 * Try PATCH `/me` so profile changes can persist server-side when the API supports it.
 * @returns {Promise<{ serverSynced: boolean }>}
 */
const saveProfile = (mergedUser) => async (dispatch) => {
    if (isReadOnlyFrontendMode || !localStorage.getItem("token")) {
        return { serverSynced: false }
    }
    const body = {
        name: mergedUser?.name,
        fullName: mergedUser?.fullName,
        username: mergedUser?.username,
        email: mergedUser?.email,
        phone: mergedUser?.phone,
        title: mergedUser?.title,
    }
    const av = mergedUser?.avatar
    if (av && String(av).length <= MAX_AVATAR_PATCH_LENGTH) {
        body.avatar = av
    }
    try {
        const res = await Api.patch({ url: Urls.me, data: body, inst: 0 })
        if (res?.status >= 200 && res?.status < 300) {
            await dispatch(fetchMe())
            return { serverSynced: true }
        }
    } catch {
        /* fall through */
    }
    return { serverSynced: false }
}

const AuthActions = {
    fetchMe,
    fetchProfile,
    updateProfile,
    uploadAvatar,
    saveProfile,
    /** @returns {Promise<{ ok: boolean, message?: string }>} */
    signIn: (data, cb) => async (dispatch, _) => {
        try {
            /* inst:0 — avoid global full-screen loader; Login page has its own loading state */
            const res = await Api.post({ url: Urls.login, data, inst: 0 })

            if (!res || res.status == null) {
                return { ok: false, message: loginErrorMessage(null) }
            }

            if (res.status !== 200) {
                return { ok: false, message: loginErrorMessage(res) }
            }

            const user = res.data
            if (!user?.idToken) {
                return { ok: false, message: "Invalid response from server. Please contact support." }
            }

            let dataFiw = user.confdata
            if (dataFiw?.mapScale == undefined) {
                dataFiw = {
                    ...dataFiw,
                    mapScale: "10",
                }
            }
            if (dataFiw?.mapView == undefined) {
                dataFiw = {
                    ...dataFiw,
                    mapView: "mapbox://styles/mapbox/standard",
                }
            }
            const serializedPermission =
                typeof user.permission === "string"
                    ? user.permission
                    : JSON.stringify(user.permission ?? null)

            localStorage.setItem("user", JSON.stringify(user))
            localStorage.setItem("token", user.idToken)
            localStorage.setItem("permission", serializedPermission)
            localStorage.setItem("auth", true)
            localStorage.setItem("config", JSON.stringify(dataFiw))
            dispatch(SET_TOKEN(user.idToken))
            dispatch(SET_PERMISSION(serializedPermission))
            dispatch(SET_USER(user))
            dispatch(SET_AUTHENTICATED(true))
            dispatch(SET_COMMON_CONFIG(dataFiw))

            dispatch(CommonActions.setLastName(true, ""))
            dispatch(fetchMe())
            cb()
            return { ok: true }
        } catch (error) {
            if (import.meta.env.DEV) console.warn("[auth] signIn", error?.message)
            return { ok: false, message: "Something went wrong. Please try again." }
        }
    },
    setupConf: (reset, data, cb) => async (dispatch, _) => {
        try {
            let res = await Api.post({ data: data, url: Urls.setupConf })
            if (res?.status !== 201 && res?.status !== 200) return

            localStorage.setItem("config", JSON.stringify(res?.data?.data))
            dispatch(SET_COMMON_CONFIG(res?.data?.data))
            cb()
        } catch (error) {
            if (import.meta.env.DEV) console.warn("[auth] setupConf", error?.message)
        }
    },
}

export default AuthActions
