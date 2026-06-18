import Button from "../../components/Button"
import Api from "../../utils/api"
import { Urls } from "../../utils/url"
import { ROLE_LIST, USERS_LIST, ARC_SETTING_LIST, SET_ZOOM_CONFIG, ZOOM_CONFIG_DEFAULTS } from "../reducers/adminManagement-reducer"
import { SET_SIDEBAR_MENU } from "../reducers/auth-reducer"
import CommonActions from "./common-actions"
import AuthActions from "./auth-actions"
// import Notify from "./notify-actions"


const AdminManagementActions = {
    getUsersList: (reset=true, args="", excludeIds=[]) => async (dispatch, _) => {
        try {
            console.log("AuthActions.signin")
            const res = await Api.get({ url: `${Urls.admin_userList}${args!=""?"?"+args:""}`})
            if (res?.status !== 200) return
            let dataAll = res.data.data
            if (excludeIds.length) {
                dataAll = dataAll.filter((u) => !excludeIds.includes(u.id))
            }
            dispatch(USERS_LIST({dataAll,reset}))
        } catch (error) {
            console.log(error, "amit errorerror 37")

            // dispatch(Notify.error('something went wrong! please try again after a while'))
        }
    },
    getRoleList: (reset=true,args="") => async (dispatch, _) => {
        try {
            console.log("AuthActions.signin")
            const res = await Api.get({ url: `${Urls.admin_roleList}${args!=""?"?"+args:""}`})
            if (res?.status !== 200) return
            console.log(res.data, "res.data")
            const dataAll = res.data.data
            dispatch(ROLE_LIST({dataAll,reset}))
        } catch (error) {
            console.log(error, "amit errorerror 37")

            // dispatch(Notify.error('something went wrong! please try again after a while'))
        }
    },
    getUserById: (id) => async (dispatch, _) => {
        try {
            const res = await Api.get({ url: `${Urls.admin_userList}/${id}` });
            if (res?.status !== 200) return null;
            const user = res.data?.data || res.data;
            return (user && typeof user === 'object' && user.id) ? user : null;
        } catch (error) {
            console.log(error, 'getUserById error');
            return null;
        }
    },
    postUser: (reset, data, cb, uniqueId, errorCb) => async (dispatch, _) => {
        try {
            let res;

            if(uniqueId==null){
                res = await Api.post({ data: data, url: Urls.admin_userList })
            }
            else{
                res = await Api.put({ data: data, url: Urls.admin_userList + "/" + uniqueId })
            }

            if (res?.status !== 201 && res?.status !== 200) {
                if (errorCb) errorCb(res?.data || res);
                return;
            }
            cb()
        } catch (error) {
            console.log(error, "amit errorerror 37")
            if (errorCb) errorCb({ msg: 'Something went wrong. Please try again.' });
        }
    },
    getRoleMenu: (roleid) => async (dispatch, _) => {
        try {
            const res = await Api.get({ url: `${Urls.role_menu}?role_id=${roleid}&include_inactive=true` });
            if (res?.status !== 200) return null;
            const menu = res.data?.menu;
            return Array.isArray(menu) ? menu : null;
        } catch (error) {
            console.log(error, 'getRoleMenu error');
            return null;
        }
    },
    saveRoleMenu: (roleid, menuItems, cb) => async (dispatch, _) => {
        try {
            const flatten = (items) => items.reduce((acc, item) => {
                acc.push({ id: item.id, is_active: item.is_active, title: item.title, route: item.route, sequence: item.sequence });
                if (item.children?.length) acc.push(...flatten(item.children));
                return acc;
            }, []);
            const res = await Api.patch({ data: { role_id: roleid, permissions: flatten(menuItems) }, url: Urls.role_menu });
            if (res?.status !== 200 && res?.status !== 201) return;
            cb?.();
        } catch (error) {
            console.log(error, 'saveRoleMenu error');
        }
    },
    getArcSettingList: () => async (dispatch) => {
        try {
            const res = await Api.get({ url: Urls.arc_setting });
            if (res?.status !== 200) return;
            dispatch(ARC_SETTING_LIST(res.data.data ?? []));
        } catch (error) {
            console.log(error, "getArcSettingList error");
        }
    },

    postArcSetting: (data, cb, errorCb) => async () => {
        try {
            const res = await Api.post({ data, url: Urls.arc_setting });
            if (res?.status !== 200 && res?.status !== 201) {
                errorCb?.(res?.data || res);
                return;
            }
            cb?.();
        } catch (error) {
            console.log(error, "postArcSetting error");
            errorCb?.({ msg: 'Something went wrong. Please try again.' });
        }
    },

    updateArcSetting: (data, cb, errorCb) => async () => {
        try {
            const res = await Api.patch({ data, url: Urls.arc_setting });
            if (res?.status !== 200 && res?.status !== 201) {
                errorCb?.(res?.data || res);
                return;
            }
            cb?.();
        } catch (error) {
            console.log(error, "updateArcSetting error");
            errorCb?.({ msg: 'Something went wrong. Please try again.' });
        }
    },

    deleteArcSetting: (band, technology, cb, errorCb) => async () => {
        try {
            const res = await Api.delete({ data: { band, technology }, url: Urls.arc_setting });
            if (res?.status !== 200 && res?.status !== 201) {
                errorCb?.(res?.data || res);
                return;
            }
            cb?.();
        } catch (error) {
            console.log(error, "deleteArcSetting error");
            errorCb?.({ msg: 'Something went wrong. Please try again.' });
        }
    },

    getZoomConfig: () => async (dispatch) => {
        try {
            const res = await Api.get({ url: Urls.zoom_config });
            if (res?.status === 200 && res.data?.data) {
                dispatch(SET_ZOOM_CONFIG(res.data.data));
            }
            // if API doesn't exist yet, defaults from reducer stay in place
        } catch {
            // silently use defaults — backend not yet implemented
        }
    },

    saveZoomConfig: (data, cb, errorCb) => async (dispatch) => {
        try {
            const res = await Api.post({ data, url: Urls.zoom_config });
            const bodyStatus = res?.data?.status ?? res?.status;
            if (bodyStatus !== 200 && bodyStatus !== 201) {
                errorCb?.({ msg: res?.data?.msg || 'Failed to save zoom config. Please try again.' });
                return;
            }
            dispatch(SET_ZOOM_CONFIG(data));
            cb?.();
        } catch (error) {
            console.log(error, 'saveZoomConfig error');
            errorCb?.({ msg: 'Failed to save zoom config. Please try again.' });
        }
    },

    postRole: (reset, data, cb, uniqueId) => async (dispatch, _) => {
        try {
            console.log("AuthActions.signin", uniqueId)
            let res
            if(uniqueId==null){
                res = await Api.post({ data: data, url: Urls.admin_roleList })
            }else{
                res = await Api.put({ data: data, url: Urls.admin_roleList + "/" + uniqueId })
            }
            if (res?.status !== 201 && res?.status !== 200) return
            cb()
        } catch (error) {
            console.log(error, "amit errorerror 37")
        }
    }
}


export default AdminManagementActions;