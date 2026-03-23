import React, { useState, useMemo, useEffect } from "react";
import { useDispatch, useSelector  } from "react-redux";
import MapActions from "../../store/actions/map-actions";
import * as Unicons from '@iconscout/react-unicons';

import DropdownButton from "./DropdownButton";
import AddMapLayersPanel from "./AddMapLayersPanel";

const RightFilters = () => {

  const dispatch = useDispatch();

  /* ---------------- GLOBAL DATA ---------------- */
  const rawCells = useSelector(state => state.map.rawCells || []);

  /* ---------------- STATE ---------------- */

  const [openDropdown, setOpenDropdown] = useState(null);
  // const [layerPanelOpen, setLayerPanelOpen] = useState(false);

  const [siteSearch, setSiteSearch] = useState("");
  const [searchMode, setSearchMode] = useState("site");

  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);

  /* ---------------- HOOKS ---------------- */

    useEffect(() => {
        const handleOutsideClick = () => {
            setOpenDropdown(null);
        };

        document.addEventListener("click", handleOutsideClick);

        return () => {
            document.removeEventListener("click", handleOutsideClick);
        };
    }, []);

  /* ---------------- HELPERS ---------------- */

  const toggleDropdown = (name) => {
    setOpenDropdown(prev => (prev === name ? null : name));
  };

  const handleResetSearch = () => {
    setSelectedSite(null);
    setSelectedCell(null);
    setSiteSearch("");

    dispatch(MapActions.setHighlightedCell(null));
    dispatch(MapActions.setSelectedCell(null));
  };

  /* ---------------- FILTER DATA ---------------- */

  const siteList = useMemo(() => (
    [...new Set(rawCells.map(c => c.site_name))]
  ), [rawCells]);

  const filteredSites = useMemo(() => (
    siteList.filter(site =>
      site?.toLowerCase().includes(siteSearch.toLowerCase())
    )
  ), [siteList, siteSearch]);

  const filteredCells = useMemo(() => (
    rawCells
      .filter(cell =>
        (!selectedSite || cell.site_name === selectedSite) &&
        cell.cell_id?.toLowerCase().includes(siteSearch.toLowerCase())
      )
      .slice(0, 50)
  ), [rawCells, selectedSite, siteSearch]);

  /* ---------------- UI ---------------- */

  return (
    <div className="flex gap-2 ml-auto">

    {/* ---------------- ADD MAP LAYERS ---------------- */}
    <div className="relative">
        <button
            onClick={(e) => { e.stopPropagation(); toggleDropdown("layers"); }}
            className="
                    w-full md:w-auto
                    px-4 py-2
                    bg-[#162a52]
                    hover:bg-[#1e3a70]
                    text-white text-sm
                    rounded-lg
                    border border-[#2c4a85]
                    transition
                    min-w-[120px]
                    flex items-center justify-center
                    "        
            >
            Add MapLayer <Unicons.UilAngleDown size={16} />
        </button>

        {/* ✅ Always mounted — never unmounts, state survives */}
        <div style={{ display: openDropdown === "layers" ? 'block' : 'none' }}>
            <AddMapLayersPanel onClose={() => setOpenDropdown(null)} />
        </div>
    </div>

      {/* ---------------- MAP STYLE ---------------- */}
      <DropdownButton
        id="mapStyle"
        label="Map Style"
        openDropdown={openDropdown}
        toggleDropdown={toggleDropdown}
      >
        <div className="absolute right-0 mt-3 bg-white text-black p-4 rounded-xl shadow-xl z-50 w-[280px]">

          {[
            { label: "Outdoors",         value: "outdoors" },
            { label: "Streets",          value: "voyager" },
            { label: "OSM",              value: "osm" },
            { label: "Satellite",        value: "satellite" },
            { label: "Light",            value: "light" },
            { label: "Dark",             value: "dark" },
          ].map(option => (
            <div
              key={option.value}
              onClick={() => {
                dispatch(MapActions.setMapConfig({ mapView: option.value }));
                setOpenDropdown(null);
              }}
              className="px-2 py-1 hover:bg-gray-200 cursor-pointer text-sm"
            >
              {option.label}
            </div>
          ))}

        </div>
      </DropdownButton>

       {/* ----------- SMART SEARCH ----------- */}
        <DropdownButton
            id="site"
            label="Search"
            openDropdown={openDropdown}
            toggleDropdown={toggleDropdown}
        >
            <div className="absolute right-0 mt-3 bg-white text-black p-5 rounded-xl shadow-2xl z-50
            w-[280px] sm:w-[320px] max-w-[90vw]">
                {/* Toggle Site / Cell Mode */}
                <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setSearchMode("site")}
                    className={`px-3 py-1 rounded-md text-sm ${
                    searchMode === "site"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200"
                    }`}
                >
                    Site
                </button>

                <button
                    onClick={() => setSearchMode("cell")}
                    className={`px-3 py-1 rounded-md text-sm ${
                    searchMode === "cell"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200"
                    }`}
                >
                    Cell
                </button>
                </div>

                {/* Search Input */}
                <input
                type="text"
                value={siteSearch}
                onChange={(e) => setSiteSearch(e.target.value)}
                placeholder={`Search ${searchMode}...`}
                className="w-full border border-gray-300 px-3 py-2 rounded-lg mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* Suggestions */}
                <div className="max-h-48 overflow-y-auto border rounded-md">

                {searchMode === "site" &&
                    filteredSites.map((site, index) => (
                    <div
                        key={index}
                        onClick={() => {
                        setSelectedSite(site);
                        setSiteSearch(site);
                        }}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                    >
                        {site}
                    </div>
                    ))}

                {searchMode === "cell" &&
                    filteredCells.map((cell, index) => (
                    <div
                        key={index}
                        onClick={() => {
                        setSelectedCell(cell);
                        setSiteSearch(cell.cell_id);
                        }}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                    >
                        {cell.cell_id}
                        <span className="text-xs text-gray-500 ml-2">
                        ({cell.site_name})
                        </span>
                    </div>
                    ))}

                </div>

                <div className="mt-4 flex gap-2">
                <button
                onClick={() => {

                    let target = null;

                    if (searchMode === "site" && selectedSite) {
                    target = rawCells.find(c => c.site_name === selectedSite);
                    }

                    if (searchMode === "cell" && selectedCell) {
                    target = selectedCell;
                    }

                    if (target) {

                    dispatch(MapActions.setHighlightedCell(target.cell_id));

                    dispatch(
                        MapActions.setViewState({
                        longitude: Number(target.longitude),
                        latitude: Number(target.latitude),
                        zoom: searchMode === "cell" ? 18 : 16,
                        transitionDuration: 1200
                        })
                    );

                    }

                    setOpenDropdown(null);

                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm"
                >
                Apply & Zoom
                </button>

                <button
                onClick={handleResetSearch}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg text-sm"
                >
                Reset Search
                </button>

            </div>
            </div>
        </DropdownButton>      

    </div>
  );
};

export default RightFilters;