Date.prototype.ddmmyyyy = function() {
	var mm = this.getMonth() + 1; // getMonth() is zero-based
	var dd = this.getDate();
	var yyyy = this.getFullYear();
	return dd + '-' + mm + '-' + yyyy;
};
/*
_function : privé appelé dans le controller
__function : appelé dans les fonctions privées
*/
/*
 * TODO : Ne pas modifier en direct le model dans les fonctions de Dialog (modification onPressAddFft_item onPressAddRec_item) et storage ..;
 * TODO : Ne pas supprimer les ffts qui ont des dépendances et modifier les dépendances si modification
 */
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/Fragment",
	"sap/ui/model/Filter",
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/m/Text",
	"sap/m/MessageToast"
], function(Controller, Fragment, Filter, Dialog, Button, Text, MessageToast) {
	"use strict";

	return Controller.extend("Timereport.controller.Main", {

		DEBUG_MODE: false,
		SAVE_KEY: "iziTR",
		PREFIXE_REC_KEY: "trkey",
		DAY_NAMES: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
		MONTH_NAMES: ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"],
		REC_SPLIT: 15, // Quinzaine en jours max : 28
		SOTRAGE: null, // localStorage

		model: new sap.ui.model.json.JSONModel(),
		data: {
			ui_title: '',
			ref_date_day: null,
			ref_date_month: null,
			ref_date_year: null,
			fft_items: [],
			rec_items: [],
			syn_tiles: [],
			nav_dyn: [], // navigation des records
			nav_fix: [] // navigation fixe (synthése , export ...)
		},

		onInit: function() {
			// Chargement des données sauvegardées en localStorage navigateur
			jQuery.sap.require("jquery.sap.storage");

			this._setStorage(jQuery.sap.storage(jQuery.sap.storage.Type.local));
			if (this.storage.get(this.SAVE_KEY)) {
				this.data = this.storage.get(this.SAVE_KEY);
				this._message("i", "Données chargées");
			}

			// Initialisation du modéle

			var ref_date = new Date();
			this._setRefDate(ref_date.getDate(), ref_date.getMonth(), ref_date.getFullYear());
			this._setUiTitle(this._buildUiTitle());
			this._setNavDyn(this._buildNavDyn());
			this._setSynTiles(this._buildSynTiles());
			this._setNavFix(this._buildNavFix());

			this.model.isBindingModeSupported(sap.ui.model.BindingMode.TwoWay);
			this.model.setData(this.data);
			this.getView().setModel(this.model);
			this._buildTimeReport();
		},

		_buildUiTitle: function() {
			var ui_title;
			if (this.data.ref_date_day > this.REC_SPLIT) {
				ui_title = "2ème quinzaine du mois de " + this.MONTH_NAMES[this.data.ref_date_month] + " " + this.data.ref_date_year;
			}
			else {
				ui_title = "1ère quinzaine du mois de " + this.MONTH_NAMES[this.data.ref_date_month] + " " + this.data.ref_date_year;
			}
			return ui_title;
		},

		_buildSynTiles: function() {
			var year = this.data.ref_date_year;
			var month = this.data.ref_date_month;
			var day = this.data.ref_date_day;
			var navDate = new Date(year, month);

			var isWeekend = false;
			var firstDay = 1;
			var lastDay = this.REC_SPLIT; // faux si > 28
			var key;
			var total;
			var actualDate = new Date();
			var daysRest = 0;
			var daysWeekEnd = 0;
			var daysNotCompleted = 0;

			var syn_tiles = [];

			if (day > this.REC_SPLIT) {
				firstDay = this.REC_SPLIT + 1;
				lastDay = new Date(year, month + 1, 0).getDate();
			}

			if (actualDate.getMonth() != month) {

				syn_tiles.push({
					"icon": "hint",
					"type": "Monitor",
					"title": "Choisissez une quinzaine du mois de " + this.MONTH_NAMES[actualDate.getMonth()] + " " + actualDate.getFullYear()
				});
			}
			else {
				for (var i = firstDay; i <= lastDay; i++) {
					navDate.setDate(i);
					key = this.PREFIXE_REC_KEY + navDate.ddmmyyyy();
					isWeekend = (navDate.getDay() === 6) || (navDate.getDay() === 0);
					total = 0;
					// jours restant sans compté les weekend
					if (i > actualDate.getDate() && !isWeekend) {
						daysRest += 1;
					}
					if (isWeekend) {
						daysWeekEnd += 1;
					}
					else {
						this.data.rec_items.forEach(function(obj) {
							if (obj.key === key) {
								obj.tr.forEach(function(obj2) {
									total += obj2.tps;
								});
							}
						});
						if (total != 1) {
							daysNotCompleted += 1;

						}
						total = 0;
					}
				}



				syn_tiles.push({
					"icon": "hint",
					"number": daysRest,
					"title": "Jours avant la fin de la quinzaine."
				}, {
					"icon": "donut-chart",
					"number": daysNotCompleted,
					"title": "Jours non complété"
				}, {
					"icon": "bed",
					"number": daysWeekEnd,
					"title": "Jours de repos"
				});
			}
			return syn_tiles;
		},

		_buildNavDyn: function() {

			var year = this.data.ref_date_year;
			var month = this.data.ref_date_month;
			var day = this.data.ref_date_day;
			var navDate = new Date(year, month);

			var isWeekend = false;
			var firstDay = 1;
			var lastDay = this.REC_SPLIT; // faux si > 28
			var key;
			var icon;
			var total;
			var nav_dyn = [];
			if (day > this.REC_SPLIT) {
				firstDay = this.REC_SPLIT + 1;
				lastDay = new Date(year, month + 1, 0).getDate();
			}
			for (var i = firstDay; i <= lastDay; i++) {
				navDate.setDate(i);
				key = this.PREFIXE_REC_KEY + navDate.ddmmyyyy();
				isWeekend = (navDate.getDay() === 6) || (navDate.getDay() === 0);
				total = 0;
				if (isWeekend) {
					icon = 'sap-icon://bed';
				}
				else {
					this.data.rec_items.forEach(function(obj) {
						if (obj.key === key) {
							obj.tr.forEach(function(obj2) {
								total += obj2.tps;
							});
						}
					});
					if (total === 1) {
						icon = 'sap-icon://sys-enter';

					}
					else if (total === 0) {
						icon = 'sap-icon://sys-cancel';
					}
					else {
						icon = 'sap-icon://goalseek';
					}
				}
				nav_dyn.push({
					title: this.DAY_NAMES[navDate.getDay()] + ' ' + i + ' ' + this.MONTH_NAMES[navDate.getMonth()],
					icon: icon,
					key: key,
					enabled: !isWeekend
				});

			}
			return nav_dyn;
		},

		_buildNavFix: function() {
			var nav_fix = [];
			nav_fix.push({
				title: 'Synthese',
				icon: 'sap-icon://goal',
				key: 'synthese'
			});
			nav_fix.push({
				title: 'FFTs',
				icon: 'sap-icon://target-group',
				key: 'ffts'
			});
			nav_fix.push({
				title: 'Import / Export',
				icon: 'sap-icon://database',
				key: 'importExportJSON'
			});
			nav_fix.push({
				title: 'Sauvegarder',
				icon: 'sap-icon://download',
				key: 'save'
			});

			return nav_fix;
		},

		_buildTimeReport: function() {
			var columnData = []; //{columnName}
			var rowData = [];
			var keyToDate = []; //key : date

			columnData.push[{
				'columnName': 'cod'
			}];

			var year = this.data.ref_date_year;
			var month = this.data.ref_date_month;
			var day = this.data.ref_date_day;
			var navDate = new Date(year, month);
			var isWeekend = false;
			var firstDay = 1;
			var lastDay = this.REC_SPLIT; // faux si > 28
			var key;
			var total;
			if (day > this.REC_SPLIT) {
				firstDay = this.REC_SPLIT + 1;
				lastDay = new Date(year, month + 1, 0).getDate();
			}
			for (var i = firstDay; i <= lastDay; i++) {
				navDate.setDate(i);
				key = this.PREFIXE_REC_KEY + navDate.ddmmyyyy();
				// Pour avoir le texte bien
				keyToDate[key] = this.DAY_NAMES[navDate.getDay()] + ' ' + i + ' ' + this.MONTH_NAMES[navDate.getMonth()];

				columnData.push({
					'columnName': keyToDate[key]
				});

				isWeekend = (navDate.getDay() === 6) || (navDate.getDay() === 0);
				total = 0;
				if (isWeekend) {
					var row = {};
					row['cod'] = 'test';
					row[keyToDate[key]] = 'X';
					rowData.push(row);
				}
				else {
					this.data.rec_items.forEach(function(obj) {
						if (obj.key === key) {
							obj.tr.forEach(function(obj2) {
								total += obj2.tps;
							});
						}
					});
					var row = {};
					row['cod'] = 'test';
					row[keyToDate[key]] = total;
					rowData.push(row);

					total = 0;

				}
			}
		},

		onSelectNav_Dyn: function(evt) {
			var key = evt.getParameter('item').getKey();
			var viewId = this.getView().getId();

			if (key.substring(0, this.PREFIXE_REC_KEY.length) === this.PREFIXE_REC_KEY) {
				this._selectRec_item(evt, key);
				key = this.PREFIXE_REC_KEY;
			}
			else if (key === "save") {
				this._save(evt);
				return;
			}
			// refresh
			else if (key === "synthese") {
				//this._message("i", "syn_tile")
				this.__refreshSyn_tiles();
			}
			sap.ui.getCore().byId(viewId + "--pageContainer").to(viewId + "--" + key);
		},
		onPressLeftNav: function(evt) {
			var total = 0;
			var instance = this;
			var day = this.data.ref_date_day;
			var month = this.data.ref_date_month;
			var year = this.data.ref_date_year;

			if (day > 15) {
				day = 1;
			}
			else {
				day = 28;
				if (month === 0) {
					year -= 1;
					month = 11;
				}
				else {
					month -= 1;
				}

			}
			this._log("day " + day + ", month " + month + ", year : " + year);
			this._setRefDate(day, month, year);
			this._setUiTitle(this._buildUiTitle());
			this._setNavDyn(this._buildNavDyn());
			this.__refreshSyn_tiles();
			this.model.refresh(true);
		},
		onPressRightNav: function(evt) {
			var total = 0;
			var instance = this;
			var day = this.data.ref_date_day;
			var month = this.data.ref_date_month;
			var year = this.data.ref_date_year;

			if (day > 15) {
				day = 1;
				if (month === 11) {
					month = 0;
					year += 1;
				}
				else {
					month += 1;
				}
			}
			else {
				day = 16;
			}

			this._log("day " + day + ", month " + month + ", year : " + year);
			this._setRefDate(day, month, year);
			this._setUiTitle(this._buildUiTitle());
			this._setNavDyn(this._buildNavDyn());
			this.__refreshSyn_tiles();
			this.model.refresh(true);
		},

		onChangeDetailsCom: function(evt) {
			// retrouvé l'index 
			var key = this.getView().byId("tr_key").getValue();
			var com = this.getView().byId("tr_details_com").getValue();
			var fft = this.getView().byId("tr_details_fft_fft").getValue();
			var tps;
			var key_index = 0;
			var fft_already_at_index = 0;
			var instance = this;
			// retrouvé l'index de la clée ou la créer
			this.data.rec_items.forEach(function(rec_item, index) {
				if (rec_item.key === key) {

					rec_item.tr.forEach(function(rec_tr, index2) {
						instance._log("rec_tr.fft = " + fft);
						if (rec_tr.fft === fft) {
							tps = rec_tr.tps;
							fft_already_at_index = index2;
							key_index = index;
							return false;
						}

					});

				}
			});
			this._log("index : " + key_index + ", fft index : " + fft_already_at_index + ", com : " + com);

			this.model.setProperty("/rec_items/" + key_index + "/tr/" + fft_already_at_index, {
				fft: fft,
				com: com,
				tps: tps
			});

			this._message('i', 'Commentaire mis à jour');
		},
		// = goToTRDetail
		onRecItemPress: function(evt) {
			// On rempli les données et on va dans le détail
			var fft_selected = evt.getSource().getTitle();
			var inti;
			var cod;
			var com = evt.getSource().getDescription();
			this.data.fft_items.forEach(function(fft_item, index) {
				if (fft_item.fft === fft_selected) {
					inti = fft_item.inti;
					cod = fft_item.cod;
				}
			});
			this.getView().byId("tr_details_fft_fft").setValue(fft_selected);
			this.getView().byId("tr_details_fft_cod").setValue(cod);
			this.getView().byId("tr_details_fft_inti").setValue(inti);
			this.getView().byId("tr_details_com").setValue(com);

			this.byId("splitTR").to(this.createId("detail"));
		},
		onPressGestionRec_item: function(evt) {
			this.byId("splitTR").to(this.createId("add"));
		},
		onPressAddRec_item: function() {
			var tps = parseFloat(this.getView().byId("tr_tps").getValue());
			var key = this.getView().byId("tr_key").getValue();
			var key_index = 0;
			var key_find = false;
			var fft_already_here = false;
			var fft_already_at_index = 0;
			var fft_already_tps = 0;
			var total = tps;
			var com = this.getView().byId("tr_com").getValue();
			var fft = this.getView().byId("tr_fft").getValue();

			// retrouvé l'index de la clée ou la créer
			this.data.rec_items.forEach(function(rec_item, index) {
				if (rec_item.key === key) {
					rec_item.tr.forEach(function(rec_tr, index2) {
						total += rec_tr.tps;
						if (rec_tr.fft === fft) {
							fft_already_here = true;
							fft_already_at_index = index2;
							fft_already_tps = rec_tr.tps;
						}
					});
					key_index = index;
					key_find = true;
					return false;
				}
			});

			// ajout de l'entree
			if (!key_find) {
				key_index = this._onPressAddRec_itemKey({
					key: key,
					tr: []
				});
			}
			// controles !
			var fft_find = false;
			if (isNaN(tps)) {
				this._message('e', "Rentré un temps valable (ex : 0.25)");
				return;
			}
			// fft déjà rentré pour cette clée ? on propose la modification
			if (fft_already_here) {
				total -= fft_already_tps;
				var dialog = new Dialog({
					title: 'Confirmation',
					type: 'Message',
					content: new Text({
						text: "La FFT " + fft + " a déjà une entrée pour cette date"
					}),
					beginButton: new Button({
						text: 'Modifier',
						press: function() {
							this.getModel().setProperty("/rec_items/" + key_index + "/tr/" + fft_already_at_index, {
								fft: fft,
								com: com,
								tps: tps
							});
							sap.m.MessageToast.show("FFT " + fft + " modifiée !");
							dialog.close();
						}
					}),
					endButton: new Button({
						text: 'Annuler',
						press: function() {
							dialog.close();
							return;
						}
					}),
					afterClose: function() {
						dialog.destroy();
					}
				});
				dialog.setModel(this.model);
				dialog.open();
			}
			else {
				if (total > 1) {
					this._message('e', "Temps max : 1 (correspondant à une journée de travail)");
					return;
				}
				// fft presente ?
				this.data.fft_items.forEach(function(fft_item, index) {
					if (fft_item.fft === fft) {
						fft_find = true;
						return;
					}
				});
				if (!fft_find) {
					this._message('e', "La FFT n'est pas (encore) présente dans les données");
					//return;
				}

				// ajout de l'item dans l'entree
				this._onPressAddRec_item({
					fft: fft,
					com: com,
					tps: tps
				}, key_index);
			}

			//màj nav dyn
			this.__refreshNav_dyn(key, total);
			this.model.refresh(true);
		},
		onPressDelRec_item: function(evt) {
			// si la FFT est renseigné on 
			var fft = this.getView().byId("tr_fft").getValue();
			var key = this.getView().byId("tr_key").getValue();
			var fft_is_present = false;
			var tr_index = 0;
			var tr_items = [];
			var tr_total = 0;
			// e1 : existe ?
			this.data.rec_items.forEach(function(rec_item, index) {
				if (rec_item.key === key) {
					tr_index = index;
					rec_item.tr.forEach(function(tr_item, index2) {
						if (tr_item.fft === fft) {
							fft_is_present = true;
						}
						else {
							tr_items.push(tr_item);
							tr_total += tr_item.tps;
						}
					});

				}
			});
			if (!fft_is_present) {
				sap.m.MessageToast.show("La FFT " + fft + " n'existe pas pour ce record");
				return;
			}
			else {

				sap.m.MessageToast.show("Suppresion de la FFT " + fft + " du record");
				this._setTrItems(tr_items, tr_index);
				this.__refreshNav_dyn(key, tr_total);
				this.model.refresh(true);

			}
		},
		/* FFTs */
		onHelpRequestFft_items: function(evt) {

			var tr_fft = evt.getSource().getValue();
			this.inputId = evt.getSource().getId();
			// create value help dialog
			if (!this._valueHelpDialog) {
				this._valueHelpDialog = sap.ui.xmlfragment(
					"Timereport.view.FFTF4",
					this
				);
				this.getView().addDependent(this._valueHelpDialog);
			}

			// create a filter for the binding
			this._valueHelpDialog.getBinding("items").filter([new Filter(
				"fft",
				sap.ui.model.FilterOperator.Contains, tr_fft
			)]);

			// open value help dialog filtered by the input value
			this._valueHelpDialog.open(tr_fft);
		},

		onPressAddFft_item: function(evt) {
			var fft = this.getView().byId("ffts_fft").getValue();
			var inti = this.getView().byId("ffts_inti").getValue();
			var cod = this.getView().byId("ffts_cod").getValue();

			// e1 : vide
			if (fft.length === 0) {
				sap.m.MessageToast.show("La FFT est vide");
				return;
			}
			// e2 : existe ?
			var i = 0;
			var index = -1;
			this.data.fft_items.forEach(function(obj) {
				if (obj.fft === fft) {
					index = i;
				}
				i++;
			});
			// on a une entrée on propose de la remplacer
			if (index > -1) {
				var dialog = new Dialog({
					title: 'Confirmation',
					type: 'Message',
					content: new Text({
						text: 'La FFT ' + fft + 'existe déjà.'
					}),
					beginButton: new Button({
						text: 'Modifier FFT',
						press: function() {
							this.getModel().setProperty("/fft_items/" + index, {
								fft: fft,
								inti: inti,
								cod: cod
							});
							sap.m.MessageToast.show("FFT " + fft + " modifiée !");
							dialog.close();
						}
					}),
					endButton: new Button({
						text: 'Annuler',
						press: function() {
							dialog.close();
							return;
						}
					}),
					afterClose: function() {
						dialog.destroy();
					}
				});
				dialog.setModel(this.model);
				dialog.open();
			}
			else {
				//insertion
				this._onPressAddFft_item({
					fft: fft,
					inti: inti,
					cod: cod
				});
				sap.m.MessageToast.show("FFT " + fft + " ajoutée !");

			}
			this.model.refresh(true);

		},
		onPressDelFft_item: function(evt) {
			var fft = this.getView().byId("ffts_fft").getValue();
			var fft_is_present = false;
			var fft_items = [];
			var fft_dep = "";
			// e1 : existe ?
			var i = 0;
			this.data.fft_items.forEach(function(obj) {
				if (obj.fft === fft) {
					fft_is_present = true;
				}
				else {
					fft_items.push(obj);
				}
				i++;
			});
			if (!fft_is_present) {
				sap.m.MessageToast.show("La FFT " + fft + " n'existe pas");
				return;
			}
			else {
				// verification des dependances
				this.data.rec_items.forEach(function(rec_item, index) {
					rec_item.tr.forEach(function(rec_tr, index2) {
						if (rec_tr.fft === fft) {
							fft_dep += ", " + rec_item.key;
						}
					});
				});
				if (fft_dep.length != 0) {
					sap.m.MessageToast.show("Suppresion de la FFT " + fft + " impossible. Dépendance : " + fft_dep);
				}
				else {
					sap.m.MessageToast.show("Suppresion de la FFT " + fft);
					this._setFftItems(fft_items);
					this.model.refresh(true);
				}

			}
		},

		_handleValueHelpSearch: function(evt) {
			var sValue = evt.getParameter("value");
			var oFilter = new Filter(
				"fft",
				sap.ui.model.FilterOperator.Contains, sValue
			);
			evt.getSource().getBinding("items").filter([oFilter]);
		},

		_handleValueHelpClose: function(evt) {
			var oSelectedItem = evt.getParameter("selectedItem");
			if (oSelectedItem) {
				var productInput = this.getView().byId(this.inputId);
				productInput.setValue(oSelectedItem.getTitle());
			}
			evt.getSource().getBinding("items").filter([]);

		},
		onPressExportJSON: function() {
			var newData = {
				fft_items: [],
				rec_items: []

			};
			// On export les ffts et les records NO MORE !
			newData.fft_items = this.data.fft_items;
			newData.rec_items = this.data.rec_items;

			this.getView().byId("importExportJSON_value").setValue(JSON.stringify(newData));

			//window.open("data:text/json;charset=utf-8," + JSON.stringify(newData));
		},
		onPressImportJSON: function() {
			var newData = this.getView().byId("importExportJSON_value").getValue();
			if (/^[\],:{}\s]*$/.test(newData.replace(/\\["\\\/bfnrtu]/g, '@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

				newData = JSON.parse(newData);
				// On import les ffts et les records NO MORE !
				this.data.rec_items = newData.rec_items;
				this.data.fft_items = newData.fft_items;
				this.__refreshSyn_tiles();
				this._setNavDyn(this._buildNavDyn());
				this.model.refresh(true);
				this._message('i', "Les données ont été importées avec succès");

			}
			else {

				this._message('e', "Les données ne sont pas au format JSON");

			}

		},
		_save: function(evt) {
			this.storage.put(this.SAVE_KEY, this.data);
			this._message("i", "Données sauvegardées");
		},

		/* Records */
		_selectRec_item: function(evt, key) {
			var instance = this;
			// transmission de la key pour pouvoir ajouter des items
			this.getView().byId("tr_key").setValue(key);
			// MàJ des input
			this.getView().byId("tr_fft").setValue();
			this.getView().byId("tr_tps").setValue();
			this.getView().byId("tr_com").setValue();
			// rappatriement des items !
			var key_index;
			this.data.rec_items.forEach(function(rec_item, index) {
				if (rec_item.key === key) {
					key_index = index;
					return;
				}
			});
			var list = this.getView().byId("tr_list");
			list.bindItems("/rec_items/" + key_index + "/tr/", new sap.m.StandardListItem({
				title: "{fft}",
				description: "{com}",
				info: "{tps}",
				press: function(evt) {
					instance.onRecItemPress(evt);

				},
				type: "Active"
			}));
			this.onPressGestionRec_item();

		},
		_setStorage: function(storage) {
			this.storage = storage;
		},
		_setUiTitle: function(ui_title) {
			this.data.ui_title = ui_title;
		},
		_setRefDate: function(ref_date_day, ref_date_month, ref_date_year) {
			this.data.ref_date_day = ref_date_day;
			this.data.ref_date_month = ref_date_month;
			this.data.ref_date_year = ref_date_year;
		},
		_setFftItems: function(jsonArray) {
			this.data.fft_items = jsonArray;
		},
		_setRecItems: function(jsonArray) {
			this.data.rec_items = jsonArray;
		},
		_setTrItems: function(jsonArray, index) {
			this.data.rec_items[index].tr = jsonArray;
		},
		_setSynTiles: function(jsonArray) {
			this.data.syn_tiles = jsonArray;
		},
		_setNavDyn: function(jsonArray) {
			this.data.nav_dyn = jsonArray;
		},
		_setNavFix: function(jsonArray) {
			this.data.nav_fix = jsonArray;
		},
		_onPressAddFft_item: function(jsonObj) {
			this.data.fft_items.push(jsonObj);
		},
		_onPressDelFft_item: function(index) {
			this.data.fft_items.remove(index);
		},
		_onPressAddRec_itemKey: function(jsonObj) {
			this.data.rec_items.push(jsonObj);
			return this.data.rec_items.length - 1; // dernier index
		},
		_onPressAddRec_item: function(jsonObj, index) {
			this.data.rec_items[index].tr.push(jsonObj);
			//this.model.refresh(true);
		},
		_addSynTile: function(jsonObj) {
			this.data.syn_tiles.push(jsonObj);
		},
		_addNavDyn: function(jsonObj) {
			this.data.nav_dyn.push(jsonObj);
		},
		__refreshSyn_tiles: function() {
			this._setSynTiles(this._buildSynTiles());
			this.model.refresh(true);
		},
		__refreshNav_dyn: function(key, total) {
			var icon;
			this.data.nav_dyn.forEach(function(nav_dyn, index) {
				if (nav_dyn.key === key) {
					if (total === 1) {
						icon = 'sap-icon://sys-enter';
					}
					else if (total === 0) {
						icon = 'sap-icon://sys-cancel';
					}
					else {
						icon = 'sap-icon://goalseek';
					}
					nav_dyn.icon = icon;
					return;
				}
			});
		},
		_addNavFix: function(jsonObj) {
			this.data.nav_fix.push(jsonObj);
		},
		_message: function(type, msg) {
			MessageToast.show(msg);
			if (type === 'e') {}
		},
		_log: function(msg) {
			if (this.DEBUG_MODE) {
				console.log(msg);
				sap.m.MessageToast.show(msg);
			}
		}
	});



});
